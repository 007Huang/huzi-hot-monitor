// Twitter API 客户端 - 通过 twitterapi.io 获取推文数据
import type { TrendItem, SourceType } from '@/types';

const TWITTER_API_BASE = 'https://twitterapi.io';

// 频率控制缓存
const twitterCache = new Map<string, { time: number; results: TrendItem[] }>();
const CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存

interface TwitterSearchOptions {
  keyword?: string;
  limit?: number;
}

/**
 * 搜索推文 - 通过关键词搜索 Twitter 上的最新推文
 */
export async function searchTweets(options: TwitterSearchOptions): Promise<TrendItem[]> {
  const { keyword = 'AI', limit = 10 } = options;
  const apiKey = process.env.TWITTER_API_KEY;

  if (!apiKey) {
    console.warn('TWITTER_API_KEY not configured, skipping Twitter search');
    return [];
  }

  const cacheKey = `twitter-search:${keyword}`;
  const cached = twitterCache.get(cacheKey);
  if (cached && Date.now() - cached.time < CACHE_TTL) {
    return cached.results.slice(0, limit);
  }

  try {
    // twitterapi.io 搜索推文端点
    const params = new URLSearchParams({
      query: keyword,
      limit: String(limit),
    });

    const res = await fetch(`${TWITTER_API_BASE}/twitter/search?${params}`, {
      headers: {
        'x-api-key': apiKey,
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      console.error(`Twitter search failed: ${res.status} ${res.statusText}`);
      return [];
    }

    const data = await res.json();
    const tweets = data.tweets || data.data || [];
    const now = new Date().toISOString();

    const results: TrendItem[] = tweets.map((tweet: Record<string, unknown>) => {
      const text = (tweet.text || tweet.full_text || '') as string;
      const authorObj = (tweet.author || tweet.user || {}) as Record<string, unknown>;
      const author = (authorObj.username || authorObj.screen_name || '') as string;
      const tweetId = (tweet.id || tweet.tweet_id || '') as string;
      const createdAt = (tweet.created_at || tweet.createdAt || now) as string;
      const metrics = (tweet.public_metrics || tweet.metrics || {}) as Record<string, number>;

      return {
        id: `twitter-${tweetId}`,
        title: text.slice(0, 100) + (text.length > 100 ? '...' : ''),
        url: `https://twitter.com/${author}/status/${tweetId}`,
        description: text,
        score: calculateTweetScore(metrics as Record<string, number>),
        source: 'twitter' as SourceType,
        sourceLabel: 'Twitter',
        author,
        createdAt,
        fetchedAt: now,
      };
    });

    twitterCache.set(cacheKey, { time: Date.now(), results });
    return results.slice(0, limit);
  } catch (error) {
    console.error('Twitter search error:', error);
    return [];
  }
}

/**
 * 获取热门推文/趋势话题
 */
export async function fetchTwitterTrends(limit = 10): Promise<TrendItem[]> {
  const apiKey = process.env.TWITTER_API_KEY;

  if (!apiKey) {
    console.warn('TWITTER_API_KEY not configured, skipping Twitter trends');
    return [];
  }

  const cacheKey = 'twitter-trends';
  const cached = twitterCache.get(cacheKey);
  if (cached && Date.now() - cached.time < CACHE_TTL) {
    return cached.results.slice(0, limit);
  }

  try {
    const res = await fetch(`${TWITTER_API_BASE}/twitter/trends`, {
      headers: {
        'x-api-key': apiKey,
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      console.error(`Twitter trends failed: ${res.status}`);
      return [];
    }

    const data = await res.json();
    const trends = data.trends || data.data || [];
    const now = new Date().toISOString();

    const results: TrendItem[] = trends.map((trend: Record<string, unknown>, idx: number) => {
      const name = (trend.name || trend.trend_name || '') as string;
      const tweetVolume = (trend.tweet_volume || trend.tweetVolume || 0) as number;

      return {
        id: `twitter-trend-${idx}`,
        title: name,
        url: `https://twitter.com/search?q=${encodeURIComponent(name)}`,
        description: `热门话题 - ${tweetVolume > 0 ? `${tweetVolume} 条推文` : '推文数未知'}`,
        score: calculateTrendScore(tweetVolume, idx),
        source: 'twitter' as SourceType,
        sourceLabel: 'Twitter 趋势',
        createdAt: now,
        fetchedAt: now,
      };
    });

    twitterCache.set(cacheKey, { time: Date.now(), results });
    return results.slice(0, limit);
  } catch (error) {
    console.error('Twitter trends error:', error);
    return [];
  }
}

/**
 * 计算推文热度分数
 */
function calculateTweetScore(metrics: Record<string, number>): number {
  const likes = metrics.like_count || metrics.likes || 0;
  const retweets = metrics.retweet_count || metrics.retweets || 0;
  const replies = metrics.reply_count || metrics.replies || 0;
  const views = metrics.impression_count || metrics.views || 0;

  // 简单加权：转发权重最高
  const rawScore = likes * 1 + retweets * 3 + replies * 0.5 + (views > 10000 ? 20 : 0);
  // 归一化到 0-100
  return Math.min(100, Math.max(10, Math.floor(rawScore / 10)));
}

/**
 * 计算趋势话题热度分数
 */
function calculateTrendScore(volume: number, rank: number): number {
  // 排名越前分数越高，推文量也有贡献
  const rankScore = Math.max(10, 100 - rank * 5);
  const volumeScore = Math.min(40, Math.floor(Math.log10(volume + 1) * 10));
  return Math.min(100, rankScore + volumeScore);
}
