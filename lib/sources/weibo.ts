// 微博数据源 - 热搜 + 用户微博
import type { TrendItem, SourceType } from '@/types';

const searchCache = new Map<string, { time: number; results: TrendItem[] }>();
const CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存

const WEIBO_HEADERS: Record<string, string> = {
  'Accept': 'application/json',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Referer': 'https://weibo.com/',
  'X-Requested-With': 'XMLHttpRequest',
};

// 添加可选 Cookie
function getHeaders(): Record<string, string> {
  const headers = { ...WEIBO_HEADERS };
  const cookie = process.env.WEIBO_COOKIE;
  if (cookie) {
    headers['Cookie'] = cookie;
  }
  return headers;
}

/**
 * 获取微博热搜
 * 端点: https://weibo.com/ajax/side/hotSearch
 */
export async function fetchWeiboHotSearch(limit = 20): Promise<TrendItem[]> {
  const cacheKey = 'weibo-hot';
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.time < CACHE_TTL) {
    return cached.results.slice(0, limit);
  }

  try {
    const res = await fetch('https://weibo.com/ajax/side/hotSearch', {
      headers: getHeaders(),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      console.error(`Weibo hot search failed: ${res.status}`);
      return [];
    }

    const data = await res.json();
    const realtime = data?.data?.realtime || [];
    const now = new Date().toISOString();

    const results: TrendItem[] = realtime
      .filter((item: Record<string, unknown>) => {
        // 过滤广告和推广
        const isAd = (item as { is_ad?: number }).is_ad === 1;
        const label = (item as { label_name?: string }).label_name || '';
        return !isAd && label !== '商';
      })
      .map((item: Record<string, unknown>, idx: number) => {
        const word = (item.word || item.note || '') as string;
        const num = (item.num || item.raw_hot || 0) as number;
        const rank = (item.rank ?? idx + 1) as number;
        const labelName = (item as { label_name?: string }).label_name || '';

        return {
          id: `weibo-hot-${idx}`,
          title: word,
          url: `https://s.weibo.com/weibo?q=${encodeURIComponent(word)}`,
          description: `${labelName ? `[${labelName}] ` : ''}微博热搜 #${rank}${num > 0 ? ` · ${formatHotNum(num)}` : ''}`,
          score: calculateWeiboScore(num, rank),
          source: 'weibo' as SourceType,
          sourceLabel: '微博热搜',
          createdAt: now,
          fetchedAt: now,
        };
      });

    searchCache.set(cacheKey, { time: Date.now(), results });
    return results.slice(0, limit);
  } catch (error) {
    console.error('Weibo hot search error:', error);
    return [];
  }
}

/**
 * 搜索微博用户（账号识别用）
 * 端点: https://weibo.com/ajax/side/search?q=xxx
 */
export async function searchWeiboUser(name: string): Promise<{ uid: string; name: string; screenName: string } | null> {
  try {
    const res = await fetch(`https://weibo.com/ajax/side/search?q=${encodeURIComponent(name)}`, {
      headers: getHeaders(),
      signal: AbortSignal.timeout(3000),
    });

    if (!res.ok) return null;

    const data = await res.json();
    // 用户结果在 data.data.cards 中 type=11 的卡片里
    const cards = data?.data?.cards || [];
    for (const card of cards) {
      if (card.card_type === 11 && card.user) {
        return {
          uid: String(card.user.id),
          name: card.user.name || name,
          screenName: card.user.screen_name || card.user.name || name,
        };
      }
      // 有些结果在 card_group 里
      const group = card.card_group || [];
      for (const sub of group) {
        if (sub.user) {
          return {
            uid: String(sub.user.id),
            name: sub.user.name || name,
            screenName: sub.user.screen_name || sub.user.name || name,
          };
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * 获取微博用户时间线（账号识别用）
 * 端点: https://weibo.com/ajax/statuses/mymblog?uid=xxx
 */
export async function fetchWeiboUserTimeline(uid: string, limit = 10): Promise<TrendItem[]> {
  const cacheKey = `weibo-user:${uid}`;
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.time < CACHE_TTL) {
    return cached.results.slice(0, limit);
  }

  try {
    const res = await fetch(`https://weibo.com/ajax/statuses/mymblog?uid=${uid}&page=1&feature=0`, {
      headers: getHeaders(),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      console.error(`Weibo user timeline failed: ${res.status}`);
      return [];
    }

    const data = await res.json();
    const list = data?.data?.list || [];
    const now = new Date().toISOString();

    const results: TrendItem[] = list
      .filter((item: Record<string, unknown>) => {
        // 过滤纯转发，保留原创和有评论的
        const isRetweet = !!(item.retweeted_status);
        return !isRetweet;
      })
      .map((item: Record<string, unknown>, idx: number) => {
        const textRaw = (item.text_raw || item.text || '') as string;
        // 清理 HTML 标签
        const text = textRaw.replace(/<[^>]+>/g, '').trim();
        const idStr = (item.idstr || item.mbid || String(item.id || idx)) as string;
        const createdAt = (item.created_at || now) as string;
        const repostsCount = (item.reposts_count || 0) as number;
        const commentsCount = (item.comments_count || 0) as number;
        const attitudesCount = (item.attitudes_count || 0) as number;
        const userName = ((item.user || {}) as Record<string, unknown>).screen_name || '';

        return {
          id: `weibo-user-${idStr}`,
          title: text.slice(0, 100) + (text.length > 100 ? '...' : ''),
          url: `https://weibo.com/${uid}/${idStr}`,
          description: text,
          score: calculateWeiboPostScore(attitudesCount, repostsCount, commentsCount),
          source: 'weibo' as SourceType,
          sourceLabel: `@${userName}`,
          author: userName as string,
          createdAt,
          fetchedAt: now,
        };
      });

    searchCache.set(cacheKey, { time: Date.now(), results });
    return results.slice(0, limit);
  } catch (error) {
    console.error('Weibo user timeline error:', error);
    return [];
  }
}

/**
 * 微博热搜热度分数
 */
function calculateWeiboScore(hotNum: number, rank: number): number {
  // 基于热度值
  const hotScore = Math.min(60, Math.floor(Math.log10(hotNum + 1) * 10));
  // 基于排名
  const rankScore = Math.max(10, 50 - rank * 2);
  return Math.min(100, hotScore + rankScore);
}

/**
 * 微博帖子热度分数
 */
function calculateWeiboPostScore(likes: number, reposts: number, comments: number): number {
  const rawScore = likes * 1 + reposts * 2 + comments * 0.5;
  return Math.min(100, Math.max(0, Math.floor(rawScore / 10)));
}

/**
 * 格式化热度数字
 */
function formatHotNum(num: number): string {
  if (num >= 100000000) return `${(num / 100000000).toFixed(1)}亿`;
  if (num >= 10000) return `${(num / 10000).toFixed(0)}万`;
  return String(num);
}
