// GET /api/trends - 聚合所有数据源的热点
// 核心策略：区分「搜索型源」和「浏览型源」
//   - 有关键词时：只用搜索型源（Twitter/网页搜索/知乎搜索），避免无关热榜内容
//   - 无关键词时：用全部源（热榜+搜索），展示全站热门
import { NextRequest, NextResponse } from 'next/server';
import { webSearch, fetchAITrends } from '@/lib/sources/web-search';
import { searchTweets, fetchTwitterTrends } from '@/lib/sources/twitter';
import { fetchWeiboHotSearch } from '@/lib/sources/weibo';
import { fetchZhihuHot, searchZhihu } from '@/lib/sources/zhihu';
import { fetchTechNews } from '@/lib/sources/tech-news';
import { fetchToutiaoHot } from '@/lib/sources/toutiao';
import { resolveAccount } from '@/lib/sources/account-detect';
import { filterFreshItems } from '@/lib/freshness';
import type { TrendItem, SourceType } from '@/types';

const ALL_SOURCES: SourceType[] = ['web-search', 'twitter', 'weibo', 'zhihu', 'tech-news', 'toutiao'];
const VALID_SOURCES = new Set<string>(ALL_SOURCES);

// 搜索型源：能用关键词精准搜索
const SEARCH_SOURCES: Set<string> = new Set(['web-search', 'twitter', 'zhihu']);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '30');
    const sourcesParam = searchParams.get('sources') || 'all';

    // 解析要查询的数据源
    const sources: SourceType[] = sourcesParam === 'all'
      ? ALL_SOURCES
      : sourcesParam.split(',').filter((s): s is SourceType => VALID_SOURCES.has(s));

    const hasKeyword = keyword.trim().length > 0;

    // 智能账号识别：如果关键词是账号名，获取该账号内容
    let accountItems: TrendItem[] = [];
    if (hasKeyword) {
      try {
        const account = await resolveAccount(keyword);
        if (account) {
          accountItems = account.items;
        }
      } catch {
        // 账号识别失败不影响主流程
      }
    }

    // 并行获取各数据源
    const fetchPromises: Promise<TrendItem[]>[] = [];
    const perSourceLimit = Math.max(10, Math.ceil(limit / sources.length));

    // ===== 搜索型源：有关键词时用关键词搜索，无关键词时返回默认热门 =====

    if (sources.includes('web-search')) {
      if (hasKeyword) {
        // 有关键词：搜索，限定最近一周结果（比 'day' 更宽，保证召回率）
        fetchPromises.push(webSearch({ keyword, limit: perSourceLimit, fresh: 'week' }));
      } else {
        fetchPromises.push(fetchAITrends(perSourceLimit));
      }
    }

    if (sources.includes('twitter')) {
      if (hasKeyword) {
        fetchPromises.push(searchTweets({ keyword, limit: perSourceLimit }));
      } else {
        fetchPromises.push(fetchTwitterTrends(perSourceLimit));
      }
    }

    if (sources.includes('zhihu')) {
      if (hasKeyword) {
        // 有关键词：只搜索，不取热榜（热榜内容与关键词无关）
        fetchPromises.push(searchZhihu(keyword, perSourceLimit));
      } else {
        fetchPromises.push(fetchZhihuHot(perSourceLimit));
      }
    }

    // ===== 浏览型源：只在无关键词时请求（有关键词时内容不匹配，跳过） =====

    if (!hasKeyword) {
      if (sources.includes('weibo')) {
        fetchPromises.push(fetchWeiboHotSearch(perSourceLimit));
      }

      if (sources.includes('tech-news')) {
        fetchPromises.push(fetchTechNews(perSourceLimit));
      }

      if (sources.includes('toutiao')) {
        fetchPromises.push(fetchToutiaoHot(perSourceLimit));
      }
    }

    // 等待所有数据源返回
    const settled = await Promise.allSettled(fetchPromises);
    const allResults: TrendItem[] = settled
      .filter((r): r is PromiseFulfilledResult<TrendItem[]> => r.status === 'fulfilled')
      .flatMap(r => r.value);

    // 加入账号识别结果
    allResults.push(...accountItems);

    // 去重（标题前30字符）
    const seenTitles = new Set<string>();
    const deduped: TrendItem[] = [];
    for (const item of allResults) {
      const titleKey = item.title.slice(0, 30).toLowerCase();
      if (!seenTitles.has(titleKey)) {
        seenTitles.add(titleKey);
        deduped.push(item);
      }
    }

    // 安全网：新鲜度过滤，只保留7天内的内容
    const freshDeduped = filterFreshItems(deduped);

    // 按热度排序
    freshDeduped.sort((a, b) => b.score - a.score);

    return NextResponse.json({
      success: true,
      data: freshDeduped.slice(0, limit),
      meta: {
        keyword,
        sources,
        total: freshDeduped.length,
        fetchedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Trends API error:', error);
    return NextResponse.json(
      { success: false, error: '获取热点数据失败' },
      { status: 500 }
    );
  }
}
