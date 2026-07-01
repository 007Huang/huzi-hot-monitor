// GET /api/trends - 聚合所有数据源的热点
// 核心策略：区分「搜索型源」和「浏览型源」
//   - 有关键词时：只用搜索型源（Twitter/网页搜索/知乎搜索），避免无关热榜内容
//   - 无关键词时：用全部源（热榜+搜索），展示全站热门
//   - 有关键词时：自动 Query Expansion，多查询并行搜索提高召回率
import { NextRequest, NextResponse } from 'next/server';
import { webSearch, fetchAITrends } from '@/lib/sources/web-search';
import { searchTweets, fetchTwitterTrends } from '@/lib/sources/twitter';
import { fetchWeiboHotSearch } from '@/lib/sources/weibo';
import { fetchZhihuHot, searchZhihu } from '@/lib/sources/zhihu';
import { fetchTechNews } from '@/lib/sources/tech-news';
import { fetchToutiaoHot } from '@/lib/sources/toutiao';
import { resolveAccount } from '@/lib/sources/account-detect';
import { filterFreshItems } from '@/lib/freshness';
import { expandKeywords, flattenExpandedQueries } from '@/lib/query-expansion';
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

    // ===== Query Expansion：将单个关键词扩展为多个语义查询变体 =====
    let expandedQueriesMap: Map<string, string[]> | null = null;
    let allSearchQueries: string[] = [];

    if (hasKeyword) {
      try {
        // 解析出各个关键词（用 ' OR ' 分隔）
        const individualKeywords = keyword.split(' OR ').map(k => k.trim()).filter(Boolean);
        if (individualKeywords.length > 0) {
          expandedQueriesMap = await expandKeywords(individualKeywords);
          allSearchQueries = flattenExpandedQueries(expandedQueriesMap);
          // 最多 5 个扩展查询，避免搜索源调用过多
          if (allSearchQueries.length > 5) {
            allSearchQueries = allSearchQueries.slice(0, 5);
          }
        }
      } catch (error) {
        console.error('Query expansion failed, using original keywords:', error);
      }
    }

    // 如果没有扩展结果，使用原始关键词
    if (allSearchQueries.length === 0 && hasKeyword) {
      allSearchQueries = [keyword];
    }

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
    // 每个搜索源的总分配额
    const perSourceLimit = Math.max(10, Math.ceil(limit / sources.length));
    // 每个扩展查询的分配额（平分）
    const perQueryLimit = Math.max(3, Math.ceil(perSourceLimit / Math.max(allSearchQueries.length, 1)));

    // ===== 搜索型源：有关键词时用扩展查询搜索，无关键词时返回默认热门 =====

    if (sources.includes('web-search')) {
      if (hasKeyword) {
        // 用每个扩展查询独立搜索，合并结果
        for (const q of allSearchQueries) {
          fetchPromises.push(webSearch({ keyword: q, limit: perQueryLimit, fresh: 'week' }));
        }
      } else {
        fetchPromises.push(fetchAITrends(perSourceLimit));
      }
    }

    if (sources.includes('twitter')) {
      if (hasKeyword) {
        for (const q of allSearchQueries) {
          fetchPromises.push(searchTweets({ keyword: q, limit: perQueryLimit }));
        }
      } else {
        fetchPromises.push(fetchTwitterTrends(perSourceLimit));
      }
    }

    if (sources.includes('zhihu')) {
      if (hasKeyword) {
        for (const q of allSearchQueries) {
          fetchPromises.push(searchZhihu(q, perQueryLimit));
        }
      } else {
        fetchPromises.push(fetchZhihuHot(perSourceLimit));
      }
    }

    // ===== 浏览型源：只在无关键词时请求 =====

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

    // 构建返回 meta（包含扩展查询信息供客户端使用）
    const expandedQueriesObj = expandedQueriesMap
      ? Object.fromEntries(expandedQueriesMap)
      : undefined;

    return NextResponse.json({
      success: true,
      data: freshDeduped.slice(0, limit),
      meta: {
        keyword,
        expandedQueries: expandedQueriesObj,
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
