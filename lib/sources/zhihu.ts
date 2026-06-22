// 知乎数据源 - 热榜 + 搜索
import * as cheerio from 'cheerio';
import type { TrendItem, SourceType } from '@/types';
import { createHash } from 'crypto';
import { filterFreshItems } from '@/lib/freshness';

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
];

function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function generateId(prefix: string, url: string): string {
  const hash = createHash('md5').update(url).digest('hex').slice(0, 12);
  return `${prefix}-${hash}`;
}

const searchCache = new Map<string, { time: number; results: TrendItem[] }>();
const CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Accept': 'text/html,application/json',
    'User-Agent': getRandomUserAgent(),
    'Accept-Language': 'zh-CN,zh;q=0.9',
    'Referer': 'https://www.zhihu.com/',
  };
  const cookie = process.env.ZHIHU_COOKIE;
  if (cookie) {
    headers['Cookie'] = cookie;
  }
  return headers;
}

/**
 * 获取知乎热榜
 * 优先 JSON API，失败则回退 HTML 解析
 */
export async function fetchZhihuHot(limit = 20): Promise<TrendItem[]> {
  const cacheKey = 'zhihu-hot';
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.time < CACHE_TTL) {
    return cached.results.slice(0, limit);
  }

  // 先尝试 JSON API
  let results = await fetchZhihuHotAPI(limit);
  if (results.length === 0) {
    // 回退 HTML 解析
    results = await fetchZhihuHotHTML(limit);
  }

  if (results.length > 0) {
    searchCache.set(cacheKey, { time: Date.now(), results });
  }
  return results.slice(0, limit);
}

/**
 * 知乎热榜 - JSON API
 */
async function fetchZhihuHotAPI(limit: number): Promise<TrendItem[]> {
  try {
    const res = await fetch(`https://www.zhihu.com/api/v3/feed/topstory/hot-lists/total?limit=${Math.min(limit, 50)}`, {
      headers: getHeaders(),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) return [];

    const data = await res.json();
    const items = data?.data || [];
    const now = new Date().toISOString();

    return items.map((item: Record<string, unknown>, idx: number) => {
      const target = (item.target || {}) as Record<string, unknown>;
      const title = (target.title || '') as string;
      const url = (target.url || '') as string;
      const excerpt = (target.excerpt || '') as string;
      const detailText = (item.detail_text || '') as string;
      // 热度值在 detail_text 中，如 "1234 万热度"
      const heatMatch = detailText.match(/(\d+)/);
      const heat = heatMatch ? parseInt(heatMatch[1]) : 0;

      return {
        id: generateId('zhihu-hot', url || title),
        title,
        url: url.replace(/^https?:\/\/api\.zhihu\.com/, 'https://www.zhihu.com'),
        description: `${excerpt}${detailText ? ` · ${detailText}` : ''}`.slice(0, 200),
        score: calculateZhihuHotScore(heat, idx),
        source: 'zhihu' as SourceType,
        sourceLabel: '知乎热榜',
        createdAt: now,
        fetchedAt: now,
      };
    });
  } catch {
    return [];
  }
}

/**
 * 知乎热榜 - HTML 解析（回退方案）
 */
async function fetchZhihuHotHTML(limit: number): Promise<TrendItem[]> {
  try {
    const res = await fetch('https://www.zhihu.com/hot', {
      headers: getHeaders(),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) return [];

    const html = await res.text();
    const $ = cheerio.load(html);
    const results: TrendItem[] = [];
    const now = new Date().toISOString();

    // 知乎热榜在 .HotList-list .HotItem 中
    $('.HotList-list .HotItem').each((idx, el) => {
      if (results.length >= limit) return;

      const titleEl = $(el).find('.HotItem-title');
      const title = titleEl.text().trim();
      const linkEl = $(el).find('a.HotItem-content').first();
      let url = linkEl.attr('href') || '';
      const excerpt = $(el).find('.HotItem-excerpt').text().trim();
      // 热度值
      const heatText = $(el).find('.HotItem-metrics').text().trim();
      const heatMatch = heatText.match(/(\d+)/);
      const heat = heatMatch ? parseInt(heatMatch[1]) : 0;

      if (title) {
        if (url && !url.startsWith('http')) {
          url = `https://www.zhihu.com${url}`;
        }
        results.push({
          id: generateId('zhihu-hot', url || title),
          title,
          url: url || `https://www.zhihu.com/search?type=content&q=${encodeURIComponent(title)}`,
          description: `${excerpt}${heatText ? ` · ${heatText}` : ''}`.slice(0, 200),
          score: calculateZhihuHotScore(heat, idx),
          source: 'zhihu' as SourceType,
          sourceLabel: '知乎热榜',
          createdAt: now,
          fetchedAt: now,
        });
      }
    });

    return results;
  } catch {
    return [];
  }
}

/**
 * 知乎搜索
 */
export async function searchZhihu(keyword: string, limit = 10): Promise<TrendItem[]> {
  const cacheKey = `zhihu-search:${keyword}`;
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.time < CACHE_TTL) {
    return cached.results.slice(0, limit);
  }

  try {
    const url = `https://www.zhihu.com/search?type=content&q=${encodeURIComponent(keyword)}`;
    const res = await fetch(url, {
      headers: getHeaders(),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) return [];

    const html = await res.text();
    const $ = cheerio.load(html);
    const results: TrendItem[] = [];
    const now = new Date().toISOString();

    $('.SearchResult-Card, .List-item').each((_, el) => {
      if (results.length >= limit) return;

      const titleEl = $(el).find('h2 a, .ContentItem-title a').first();
      const title = titleEl.text().trim();
      let linkUrl = titleEl.attr('href') || '';
      const excerpt = $(el).find('.content, .RichContent-inner').first().text().trim();

      // 尝试从 HTML 中提取发布时间
      const timeEl = $(el).find('.ContentItem-time, .ContentItem-meta time, span.ContentItem-statusItem time');
      const timeText = timeEl.attr('datetime') || timeEl.text().trim();
      let createdAt = now;
      if (timeText) {
        const parsed = new Date(timeText);
        if (!isNaN(parsed.getTime())) {
          createdAt = parsed.toISOString();
        }
      }

      if (title && linkUrl) {
        if (linkUrl.startsWith('//')) linkUrl = `https:${linkUrl}`;
        if (!linkUrl.startsWith('http')) linkUrl = `https://www.zhihu.com${linkUrl}`;

        results.push({
          id: generateId('zhihu-search', linkUrl),
          title,
          url: linkUrl,
          description: excerpt.slice(0, 200),
          score: 45 + Math.floor(Math.random() * 30),
          source: 'zhihu' as SourceType,
          sourceLabel: '知乎',
          createdAt,
          fetchedAt: now,
        });
      }
    });

    // 新鲜度过滤：只保留7天内的搜索结果
    const freshResults = filterFreshItems(results);

    searchCache.set(cacheKey, { time: Date.now(), results: freshResults });
    return freshResults.slice(0, limit);
  } catch (error) {
    console.error('Zhihu search error:', error);
    return [];
  }
}

/**
 * 知乎热榜热度分数
 */
function calculateZhihuHotScore(heat: number, rank: number): number {
  // 基于热度值（知乎热度一般是万级别）
  const heatScore = Math.min(60, Math.floor(Math.log10(heat + 1) * 8));
  // 基于排名
  const rankScore = Math.max(10, 50 - rank * 2);
  return Math.min(100, heatScore + rankScore);
}
