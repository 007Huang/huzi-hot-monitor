// GET /api/trends - 聚合所有数据源的热点
import { NextRequest, NextResponse } from 'next/server';
import { webSearch, fetchAITrends } from '@/lib/sources/web-search';
import { searchTweets, fetchTwitterTrends } from '@/lib/sources/twitter';
import type { TrendItem, SourceType } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '30');
    const sourcesParam = searchParams.get('sources') || 'all';

    // 解析要查询的数据源
    const sources: SourceType[] = sourcesParam === 'all'
      ? ['web-search', 'twitter']
      : sourcesParam.split(',').filter((s): s is SourceType =>
          ['web-search', 'twitter'].includes(s)
        );

    // 并行获取各数据源
    const fetchPromises: Promise<TrendItem[]>[] = [];

    if (sources.includes('web-search')) {
      if (keyword) {
        fetchPromises.push(webSearch({ keyword, limit: Math.ceil(limit / 2) }));
      } else {
        fetchPromises.push(fetchAITrends(limit));
      }
    }

    if (sources.includes('twitter')) {
      if (keyword) {
        fetchPromises.push(searchTweets({ keyword, limit: Math.ceil(limit / 2) }));
      } else {
        fetchPromises.push(fetchTwitterTrends(Math.ceil(limit / 2)));
      }
    }

    // 等待所有数据源返回
    const settled = await Promise.allSettled(fetchPromises);
    const allResults: TrendItem[] = settled
      .filter((r): r is PromiseFulfilledResult<TrendItem[]> => r.status === 'fulfilled')
      .flatMap(r => r.value);

    // 去重
    const seen = new Set<string>();
    const deduped: TrendItem[] = [];
    for (const item of allResults) {
      const key = item.title.slice(0, 30).toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(item);
      }
    }

    // 按热度排序
    deduped.sort((a, b) => b.score - a.score);

    return NextResponse.json({
      success: true,
      data: deduped.slice(0, limit),
      meta: {
        keyword,
        sources,
        total: deduped.length,
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
