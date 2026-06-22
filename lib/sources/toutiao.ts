// 今日头条数据源 - 热搜
import type { TrendItem, SourceType } from '@/types';

const searchCache = new Map<string, { time: number; results: TrendItem[] }>();
const CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存

/**
 * 获取今日头条热搜
 * 端点: https://www.toutiao.com/hot-event/hot-board/?origin=toutiao_pc
 */
export async function fetchToutiaoHot(limit = 20): Promise<TrendItem[]> {
  const cacheKey = 'toutiao-hot';
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.time < CACHE_TTL) {
    return cached.results.slice(0, limit);
  }

  try {
    const res = await fetch('https://www.toutiao.com/hot-event/hot-board/?origin=toutiao_pc', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Referer': 'https://www.toutiao.com/',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      console.error(`Toutiao hot failed: ${res.status}`);
      return [];
    }

    const data = await res.json();
    const items = data?.data || [];
    const now = new Date().toISOString();

    const results: TrendItem[] = items.map((item: Record<string, unknown>, idx: number) => {
      const title = (item.Title || item.title || '') as string;
      const url = (item.Url || item.url || '') as string;
      const clusterId = (item.ClusterIdStr || item.cluster_id || String(idx)) as string;
      const hotValue = (item.HotValue || item.hot_value || 0) as number;

      return {
        id: `toutiao-hot-${clusterId}`,
        title,
        url: url || `https://www.toutiao.com/search/?keyword=${encodeURIComponent(title)}`,
        description: `头条热搜 #${idx + 1}${hotValue > 0 ? ` · 热度 ${Math.floor(hotValue / 10000)}万` : ''}`,
        score: calculateToutiaoScore(hotValue, idx),
        source: 'toutiao' as SourceType,
        sourceLabel: '今日头条',
        createdAt: now,
        fetchedAt: now,
      };
    });

    searchCache.set(cacheKey, { time: Date.now(), results });
    return results.slice(0, limit);
  } catch (error) {
    console.error('Toutiao hot error:', error);
    return [];
  }
}

/**
 * 头条热度分数
 */
function calculateToutiaoScore(hotValue: number, rank: number): number {
  // 基于热度值
  const hotScore = Math.min(60, Math.floor(Math.log10(hotValue + 1) * 6));
  // 基于排名
  const rankScore = Math.max(10, 50 - rank * 2);
  return Math.min(100, hotScore + rankScore);
}
