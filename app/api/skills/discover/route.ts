// POST /api/skills/discover - Agent Skill: 发现热点
// 供其他 AI 调用，发现指定范围内的热点
// 策略同 trends/route.ts：有 scope 时只用搜索型源，无 scope 时用全部源
import { NextRequest, NextResponse } from 'next/server';
import { webSearch, fetchAITrends } from '@/lib/sources/web-search';
import { searchTweets, fetchTwitterTrends } from '@/lib/sources/twitter';
import { fetchWeiboHotSearch } from '@/lib/sources/weibo';
import { fetchZhihuHot, searchZhihu } from '@/lib/sources/zhihu';
import { fetchTechNews } from '@/lib/sources/tech-news';
import { fetchToutiaoHot } from '@/lib/sources/toutiao';
import { summarizeTrends } from '@/lib/ai';
import { filterFreshItems } from '@/lib/freshness';
import type { TrendItem, SourceType } from '@/types';

const ALL_SOURCES: SourceType[] = ['web-search', 'twitter', 'weibo', 'zhihu', 'tech-news', 'toutiao'];
const VALID_SOURCES = new Set<string>(ALL_SOURCES);
const SEARCH_SOURCES = new Set<string>(['web-search', 'twitter', 'zhihu']);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { scope, limit = 20, sources = ALL_SOURCES, includeSummary = true } = body;

    if (!scope) {
      return NextResponse.json(
        { success: false, error: '参数缺失：需要 scope（搜索范围/关键词）' },
        { status: 400 }
      );
    }

    const validSources = (sources as string[]).filter((s): s is SourceType => VALID_SOURCES.has(s));
    const hasScope = typeof scope === 'string' && scope.trim().length > 0;

    // 获取热点
    const fetchPromises: Promise<TrendItem[]>[] = [];

    if (validSources.includes('web-search')) {
      fetchPromises.push(
        hasScope && scope !== 'AI'
          ? webSearch({ keyword: scope, limit: Math.ceil(limit / 2), fresh: 'week' })
          : fetchAITrends(limit)
      );
    }

    if (validSources.includes('twitter')) {
      fetchPromises.push(
        hasScope
          ? searchTweets({ keyword: scope, limit: Math.ceil(limit / 2) })
          : fetchTwitterTrends(Math.ceil(limit / 2))
      );
    }

    if (validSources.includes('zhihu')) {
      if (hasScope) {
        // 有关键词：只搜索，不取热榜
        fetchPromises.push(searchZhihu(scope, Math.ceil(limit / 2)));
      } else {
        fetchPromises.push(fetchZhihuHot(Math.ceil(limit / 2)));
      }
    }

    // 浏览型源：只在无关键词时请求
    if (!hasScope) {
      if (validSources.includes('weibo')) {
        fetchPromises.push(fetchWeiboHotSearch(Math.ceil(limit / 2)));
      }
      if (validSources.includes('tech-news')) {
        fetchPromises.push(fetchTechNews(Math.ceil(limit / 2)));
      }
      if (validSources.includes('toutiao')) {
        fetchPromises.push(fetchToutiaoHot(Math.ceil(limit / 2)));
      }
    }

    const settled = await Promise.allSettled(fetchPromises);
    const trends: TrendItem[] = settled
      .filter((r): r is PromiseFulfilledResult<TrendItem[]> => r.status === 'fulfilled')
      .flatMap(r => r.value);

    // 去重排序
    const seen = new Set<string>();
    const deduped: TrendItem[] = [];
    for (const item of trends) {
      const key = item.title.slice(0, 30).toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(item);
      }
    }
    // 安全网：新鲜度过滤，只保留7天内的内容
    const freshDeduped = filterFreshItems(deduped);
    freshDeduped.sort((a, b) => b.score - a.score);
    const result = freshDeduped.slice(0, limit);

    // 生成摘要
    let summary = null;
    if (includeSummary && result.length > 0) {
      summary = await summarizeTrends(result);
    }

    return NextResponse.json({
      success: true,
      data: {
        trends: result,
        summary,
        meta: {
          scope,
          sources: validSources,
          total: result.length,
          fetchedAt: new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    console.error('Skills discover error:', error);
    return NextResponse.json(
      { success: false, error: '发现热点失败' },
      { status: 500 }
    );
  }
}
