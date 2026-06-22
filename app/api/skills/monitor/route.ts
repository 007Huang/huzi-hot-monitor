// POST /api/skills/monitor - Agent Skill: 监控关键词变化
// 供其他 AI 调用，检查关键词是否有新的匹配内容
import { NextRequest, NextResponse } from 'next/server';
import { webSearch } from '@/lib/sources/web-search';
import { searchTweets } from '@/lib/sources/twitter';
import { fetchWeiboHotSearch } from '@/lib/sources/weibo';
import { fetchZhihuHot, searchZhihu } from '@/lib/sources/zhihu';
import { fetchTechNews } from '@/lib/sources/tech-news';
import { fetchToutiaoHot } from '@/lib/sources/toutiao';
import { matchKeywords, detectFake } from '@/lib/ai';
import { filterFreshItems } from '@/lib/freshness';
import type { TrendItem, SourceType } from '@/types';

const ALL_SOURCES: SourceType[] = ['web-search', 'twitter', 'weibo', 'zhihu', 'tech-news', 'toutiao'];
const VALID_SOURCES = new Set<string>(ALL_SOURCES);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { keywords, sources = ALL_SOURCES, checkFake = true, excludeIds = [] } = body;

    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return NextResponse.json(
        { success: false, error: '参数缺失：需要非空的 keywords 数组' },
        { status: 400 }
      );
    }

    const validSources = (sources as string[]).filter((s): s is SourceType => VALID_SOURCES.has(s));

    const excludeSet = new Set(excludeIds as string[]);

    // 获取热点
    const fetchPromises: Promise<TrendItem[]>[] = [];
    const keywordQuery = keywords.join(' OR ');

    if (validSources.includes('web-search')) {
      fetchPromises.push(webSearch({ keyword: keywordQuery, limit: 15 }));
    }

    if (validSources.includes('twitter')) {
      fetchPromises.push(searchTweets({ keyword: keywordQuery, limit: 10 }));
    }

    if (validSources.includes('weibo')) {
      fetchPromises.push(fetchWeiboHotSearch(10));
    }

    if (validSources.includes('zhihu')) {
      fetchPromises.push(fetchZhihuHot(10));
      fetchPromises.push(searchZhihu(keywordQuery, 10));
    }

    if (validSources.includes('tech-news')) {
      fetchPromises.push(fetchTechNews(10));
    }

    if (validSources.includes('toutiao')) {
      fetchPromises.push(fetchToutiaoHot(10));
    }

    const settled = await Promise.allSettled(fetchPromises);
    const allTrends: TrendItem[] = settled
      .filter((r): r is PromiseFulfilledResult<TrendItem[]> => r.status === 'fulfilled')
      .flatMap(r => r.value);

    // 过滤已排除的 + 新鲜度过滤（安全网，只保留7天内的内容）
    const newTrends = filterFreshItems(allTrends.filter(t => !excludeSet.has(t.id)));

    // AI 关键词匹配
    const matchedTrends: TrendItem[] = [];
    for (const trend of newTrends.slice(0, 20)) {
      try {
        const matchResult = await matchKeywords(
          trend.title,
          trend.description || '',
          keywords
        );

        if (matchResult.matched) {
          let enhancedTrend = {
            ...trend,
            matchedKeywords: keywords,
          };

          // 可选：检测假内容
          if (checkFake) {
            const fakeResult = await detectFake(
              trend.title,
              trend.description || '',
              trend.url
            );
            enhancedTrend = {
              ...enhancedTrend,
              isFake: fakeResult.isFake,
              fakeReason: fakeResult.reason,
            };
          }

          matchedTrends.push(enhancedTrend);
        }
      } catch (error) {
        console.error('Monitor matching error for trend:', trend.id, error);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        matched: matchedTrends,
        newItems: matchedTrends.filter(t => !t.isFake),
        fakeItems: matchedTrends.filter(t => t.isFake),
        totalChecked: newTrends.length,
        totalMatched: matchedTrends.length,
        checkedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Skills monitor error:', error);
    return NextResponse.json(
      { success: false, error: '监控失败' },
      { status: 500 }
    );
  }
}
