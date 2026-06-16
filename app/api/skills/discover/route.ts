// POST /api/skills/discover - Agent Skill: 发现热点
// 供其他 AI 调用，发现指定范围内的热点
import { NextRequest, NextResponse } from 'next/server';
import { webSearch, fetchAITrends } from '@/lib/sources/web-search';
import { searchTweets, fetchTwitterTrends } from '@/lib/sources/twitter';
import { summarizeTrends } from '@/lib/ai';
import type { TrendItem, SourceType } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { scope, limit = 20, sources = ['web-search', 'twitter'], includeSummary = true } = body;

    if (!scope) {
      return NextResponse.json(
        { success: false, error: '参数缺失：需要 scope（搜索范围/关键词）' },
        { status: 400 }
      );
    }

    const validSources = (sources as string[]).filter((s): s is SourceType =>
      ['web-search', 'twitter'].includes(s)
    );

    // 获取热点
    const fetchPromises: Promise<TrendItem[]>[] = [];

    if (validSources.includes('web-search')) {
      fetchPromises.push(
        typeof scope === 'string' && scope !== 'AI'
          ? webSearch({ keyword: scope, limit: Math.ceil(limit / 2) })
          : fetchAITrends(limit)
      );
    }

    if (validSources.includes('twitter')) {
      fetchPromises.push(
        typeof scope === 'string'
          ? searchTweets({ keyword: scope, limit: Math.ceil(limit / 2) })
          : fetchTwitterTrends(Math.ceil(limit / 2))
      );
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
    deduped.sort((a, b) => b.score - a.score);
    const result = deduped.slice(0, limit);

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
