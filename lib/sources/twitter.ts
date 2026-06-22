// Twitter API 客户端 - 通过 twitterapi.io 获取推文数据
// API 文档: https://docs.twitterapi.io/api-reference/endpoint/tweet_advanced_search
import type { TrendItem, SourceType } from '@/types';
import { filterFreshItems } from '@/lib/freshness';

// 频率控制缓存
const twitterCache = new Map<string, { time: number; results: TrendItem[] }>();
const CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存

// 新鲜度窗口（天）
const FRESHNESS_DAYS = 7;

interface TwitterSearchOptions {
  keyword?: string;
  limit?: number;
}

/**
 * 搜索推文 - 使用高级搜索 API，按热门排序
 * 端点: GET /twitter/tweet/advanced_search
 * 参数:
 *   - query: 搜索查询（支持 since_time:/until_time: 等操作符）
 *   - queryType: "Top"（热门排序）或 "Latest"（最新排序）
 *   - cursor: 分页游标
 * 每页最多返回 20 条，需要用 cursor 翻页获取更多
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
    // 构建 query：关键词 + 7天时间窗口
    // since_time/until_time 使用 UNIX 秒级时间戳
    const sinceTime = Math.floor((Date.now() - FRESHNESS_DAYS * 24 * 60 * 60 * 1000) / 1000);
    const searchQuery = `${keyword} since_time:${sinceTime}`;

    // 先用 Top（热门排序）获取高互动推文
    const topResults = await fetchSearchPage(searchQuery, 'Top', Math.ceil(limit / 20));

    // 如果热门结果不够，再用 Latest（最新排序）补充
    let results = topResults;
    if (results.length < limit) {
      const latestResults = await fetchSearchPage(searchQuery, 'Latest', 1);
      // 合并去重
      const seenIds = new Set(results.map(r => r.id));
      for (const item of latestResults) {
        if (!seenIds.has(item.id)) {
          seenIds.add(item.id);
          results.push(item);
        }
      }
    }

    // 互动过滤：仅过滤零互动内容
    results = results.filter(item => {
      // 从 id 中提取 tweetId 来判断，或直接用 score 判断
      // score 为 0 表示零互动
      return item.score > 0;
    });

    // 新鲜度过滤：只保留7天内的推文（安全网，API 层已用 since_time 过滤）
    results = filterFreshItems(results);

    // 按热度排序
    results.sort((a, b) => b.score - a.score);

    twitterCache.set(cacheKey, { time: Date.now(), results });
    return results.slice(0, limit);
  } catch (error) {
    console.error('Twitter search error:', error);
    return [];
  }
}

/**
 * 分页获取搜索结果
 * @param query 搜索查询字符串
 * @param queryType "Top" 或 "Latest"
 * @param maxPages 最多翻几页（每页最多20条）
 */
async function fetchSearchPage(
  query: string,
  queryType: string,
  maxPages: number
): Promise<TrendItem[]> {
  const apiKey = process.env.TWITTER_API_KEY!;
  const allResults: TrendItem[] = [];
  let cursor = '';
  const now = new Date().toISOString();

  for (let page = 0; page < maxPages; page++) {
    const params = new URLSearchParams({
      query,
      queryType,
    });
    if (cursor) {
      params.set('cursor', cursor);
    }

    try {
      const res = await fetch(
        `https://api.twitterapi.io/twitter/tweet/advanced_search?${params}`,
        {
          headers: {
            'x-api-key': apiKey,
            'Accept': 'application/json',
          },
          signal: AbortSignal.timeout(15000),
        }
      );

      if (!res.ok) {
        console.error(`Twitter search page failed: ${res.status} ${res.statusText}`);
        break;
      }

      const data = await res.json();
      // API 响应可能是 tweets 数组或 data 数组
      const tweets = data.tweets || data.data || [];

      if (tweets.length === 0) break;

      for (const tweet of tweets as Record<string, unknown>[]) {
        const text = (tweet.text || tweet.full_text || '') as string;
        const authorObj = (tweet.author || {}) as Record<string, unknown>;
        const author = (authorObj.userName || authorObj.username || authorObj.screen_name || '') as string;
        const authorName = (authorObj.name || '') as string;
        const tweetId = (tweet.id || tweet.tweet_id || '') as string;
        const createdAt = (tweet.createdAt || tweet.created_at || now) as string;
        const likeCount = (tweet.likeCount ?? tweet.like_count ?? 0) as number;
        const retweetCount = (tweet.retweetCount ?? tweet.retweet_count ?? 0) as number;
        const replyCount = (tweet.replyCount ?? tweet.reply_count ?? 0) as number;
        const viewCount = (tweet.viewCount ?? tweet.view_count ?? 0) as number;

        allResults.push({
          id: `twitter-${tweetId}`,
          title: text.slice(0, 100) + (text.length > 100 ? '...' : ''),
          url: (tweet.url as string) || `https://x.com/${author}/status/${tweetId}`,
          description: text,
          score: calculateTweetScore({ likeCount, retweetCount, replyCount, viewCount }),
          source: 'twitter' as SourceType,
          sourceLabel: 'Twitter',
          author: authorName ? `${authorName} (@${author})` : author,
          createdAt,
          fetchedAt: now,
        });
      }

      // 检查是否有下一页
      const hasNextPage = data.has_next_page ?? data.hasNextPage;
      const nextCursor = data.next_cursor ?? data.nextCursor;

      if (!hasNextPage || !nextCursor) break;
      cursor = nextCursor;
    } catch (error) {
      console.error(`Twitter search page ${page} error:`, error);
      break;
    }
  }

  return allResults;
}

/**
 * 获取指定用户的推文（账号识别用）
 * 使用 /twitter/tweet/user_tweets 端点
 */
export async function fetchUserTweets(userName: string, limit = 10): Promise<TrendItem[]> {
  const apiKey = process.env.TWITTER_API_KEY;

  if (!apiKey) {
    console.warn('TWITTER_API_KEY not configured, skipping Twitter user tweets');
    return [];
  }

  const cacheKey = `twitter-user:${userName}`;
  const cached = twitterCache.get(cacheKey);
  if (cached && Date.now() - cached.time < CACHE_TTL) {
    return cached.results.slice(0, limit);
  }

  try {
    const params = new URLSearchParams({
      userName,
      limit: String(limit),
    });

    const res = await fetch(`https://api.twitterapi.io/twitter/tweet/user_tweets?${params}`, {
      headers: {
        'x-api-key': apiKey,
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      console.error(`Twitter user tweets failed: ${res.status}`);
      return [];
    }

    const data = await res.json();
    const tweets = data.tweets || data.data || [];
    const now = new Date().toISOString();

    const results: TrendItem[] = tweets.map((tweet: Record<string, unknown>) => {
      const text = (tweet.text || tweet.full_text || '') as string;
      const authorObj = (tweet.author || {}) as Record<string, unknown>;
      const author = (authorObj.userName || authorObj.username || '') as string;
      const authorName = (authorObj.name || '') as string;
      const tweetId = (tweet.id || tweet.tweet_id || '') as string;
      const createdAt = (tweet.createdAt || tweet.created_at || now) as string;
      const likeCount = (tweet.likeCount ?? tweet.like_count ?? 0) as number;
      const retweetCount = (tweet.retweetCount ?? tweet.retweet_count ?? 0) as number;
      const replyCount = (tweet.replyCount ?? tweet.reply_count ?? 0) as number;
      const viewCount = (tweet.viewCount ?? tweet.view_count ?? 0) as number;

      return {
        id: `twitter-user-${tweetId}`,
        title: text.slice(0, 100) + (text.length > 100 ? '...' : ''),
        url: (tweet.url as string) || `https://x.com/${author}/status/${tweetId}`,
        description: text,
        score: calculateTweetScore({ likeCount, retweetCount, replyCount, viewCount }),
        source: 'twitter' as SourceType,
        sourceLabel: `@${userName}`,
        author: authorName ? `${authorName} (@${author})` : author,
        createdAt,
        fetchedAt: now,
      };
    });

    twitterCache.set(cacheKey, { time: Date.now(), results });
    return results.slice(0, limit);
  } catch (error) {
    console.error('Twitter user tweets error:', error);
    return [];
  }
}

/**
 * 检查 Twitter 用户是否存在（账号识别用）
 */
export async function checkTwitterUser(userName: string): Promise<boolean> {
  const apiKey = process.env.TWITTER_API_KEY;
  if (!apiKey) return false;

  try {
    const res = await fetch(`https://api.twitterapi.io/twitter/user/info?userName=${encodeURIComponent(userName)}`, {
      headers: {
        'x-api-key': apiKey,
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return false;
    const data = await res.json();
    return !!(data.data?.id || data.id);
  } catch {
    return false;
  }
}

/**
 * 获取热门推文/趋势话题
 * 使用 /twitter/trends?woeid=1 端点 (全球趋势)
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
    const res = await fetch(`https://api.twitterapi.io/twitter/trends?woeid=1`, {
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
    const trends = data.trends || [];
    const now = new Date().toISOString();

    const results: TrendItem[] = trends.map((item: Record<string, unknown>, idx: number) => {
      const trend = (item.trend || item) as Record<string, unknown>;
      const name = (trend.name || trend.trend_name || '') as string;
      const rank = (trend.rank ?? idx + 1) as number;
      const query = ((trend.target as Record<string, unknown>)?.query || name) as string;

      return {
        id: `twitter-trend-${idx}`,
        title: name,
        url: `https://x.com/search?q=${encodeURIComponent(query)}`,
        description: `Twitter 热门趋势 #${rank}`,
        score: calculateTrendScore(rank - 1),
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
function calculateTweetScore(metrics: {
  likeCount: number;
  retweetCount: number;
  replyCount: number;
  viewCount: number;
}): number {
  const { likeCount = 0, retweetCount = 0, replyCount = 0, viewCount = 0 } = metrics;

  // 简单加权：转发权重最高
  const rawScore = likeCount * 1 + retweetCount * 3 + replyCount * 0 + (viewCount > 10000 ? 20 : 0);
  // 归一化到 0-100，下限改为 0（零互动排到底部）
  return Math.min(100, Math.max(0, Math.floor(rawScore / 10)));
}

/**
 * 计算趋势话题热度分数
 */
function calculateTrendScore(rank: number): number {
  // 排名越前分数越高
  const rankScore = Math.max(10, 100 - rank * 3);
  return Math.min(100, rankScore);
}