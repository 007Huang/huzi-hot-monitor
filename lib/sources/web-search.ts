// 网页搜索爬虫 - 使用 fetch + cheerio 从搜索引擎获取热点
import * as cheerio from 'cheerio';
import type { TrendItem, SourceType } from '@/types';
import { createHash } from 'crypto';
import { searchBaidu, searchSogou } from './china-search';
import { filterFreshItems } from '@/lib/freshness';

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
];

function getRandomUserAgent(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

/** 生成唯一ID（基于URL的哈希，避免重复） */
function generateId(prefix: string, url: string): string {
  const hash = createHash('md5').update(url).digest('hex').slice(0, 12);
  return `${prefix}-${hash}`;
}

// 频率控制：记录上次搜索时间
const searchCache = new Map<string, { time: number; results: TrendItem[] }>();
const CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存

interface SearchOptions {
  keyword: string;
  limit?: number;
  fresh?: 'day' | 'week' | 'month';
}

/**
 * Bing 搜索爬虫 - Bing 比 Google 更容易被爬取
 */
async function searchBing(options: SearchOptions): Promise<TrendItem[]> {
  const { keyword, limit = 10, fresh } = options;
  const cacheKey = `bing:${keyword}:${fresh || 'all'}`;

  // 检查缓存
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.time < CACHE_TTL) {
    return cached.results.slice(0, limit);
  }

  try {
    const params = new URLSearchParams({
      q: keyword,  // 纯关键词搜索，不追加修饰词
      count: String(limit * 2),
    });
    if (fresh === 'day') params.set('filters', 'ex1:"ez1"');
    if (fresh === 'week') params.set('filters', 'ex1:"ez2"');

    const url = `https://www.bing.com/search?${params.toString()}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': getRandomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      console.error(`Bing search failed: ${res.status}`);
      return [];
    }

    const html = await res.text();
    const $ = cheerio.load(html);
    const results: TrendItem[] = [];
    const now = new Date().toISOString();

    $('#b_results > li.b_algo').each((_, el) => {
      if (results.length >= limit) return;

      const titleEl = $(el).find('h2 a');
      const title = titleEl.text().trim();
      const url = titleEl.attr('href') || '';
      const description = $(el).find('.b_caption p, .b_lineclamp2').text().trim();

      if (title && url && url.startsWith('http')) {
        results.push({
          id: generateId('bing', url),
          title,
          url,
          description: description.slice(0, 200),
          score: 50 + Math.floor(Math.random() * 30), // Bing没有精确热度，给个估算
          source: 'web-search' as SourceType,
          sourceLabel: 'Bing 搜索',
          createdAt: now,
          fetchedAt: now,
        });
      }
    });

    // 更新缓存
    searchCache.set(cacheKey, { time: Date.now(), results });
    return results;
  } catch (error) {
    console.error('Bing search error:', error);
    return [];
  }
}

/**
 * DuckDuckGo 搜索 - 备用搜索引擎，更开放
 */
async function searchDuckDuckGo(options: SearchOptions): Promise<TrendItem[]> {
  const { keyword, limit = 10 } = options;
  const cacheKey = `ddg:${keyword}`;
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.time < CACHE_TTL) {
    return cached.results.slice(0, limit);
  }

  try {
    // DuckDuckGo HTML 版本
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(keyword)}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': getRandomUserAgent(),
        'Accept': 'text/html',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) return [];

    const html = await res.text();
    const $ = cheerio.load(html);
    const results: TrendItem[] = [];
    const now = new Date().toISOString();

    $('.result').each((_, el) => {
      if (results.length >= limit) return;

      const titleEl = $(el).find('.result__title a');
      const title = titleEl.text().trim();
      const url = titleEl.attr('href') || '';
      const description = $(el).find('.result__snippet').text().trim();

      if (title && url) {
        // DuckDuckGo 的链接是重定向URL，提取实际URL
        const actualUrl = url.startsWith('//duckduckgo.com/l/')
          ? decodeURIComponent(url.split('uddg=')[1]?.split('&')[0] || url)
          : url;

        results.push({
          id: generateId('ddg', actualUrl),
          title,
          url: actualUrl.startsWith('http') ? actualUrl : `https:${actualUrl}`,
          description: description.slice(0, 200),
          score: 40 + Math.floor(Math.random() * 30),
          source: 'web-search' as SourceType,
          sourceLabel: 'DuckDuckGo',
          createdAt: now,
          fetchedAt: now,
        });
      }
    });

    searchCache.set(cacheKey, { time: Date.now(), results });
    return results;
  } catch (error) {
    console.error('DuckDuckGo search error:', error);
    return [];
  }
}

/**
 * 聚合搜索 - 从多个搜索引擎获取并合并去重
 * 包含：Bing + DuckDuckGo + 百度 + 搜狗
 * 策略：先拓宽搜索获取更多内容，再用新鲜度过滤（7天窗口）筛选
 */
export async function webSearch(options: SearchOptions): Promise<TrendItem[]> {
  // 默认返回最近一周的结果，比 'day' 更宽，保证召回率
  const { keyword, limit = 20, fresh = 'week' } = options;

  // 并行搜索多个源
  const [bingResults, ddgResults, baiduResults, sogouResults] = await Promise.allSettled([
    searchBing(options),
    searchDuckDuckGo(options),
    searchBaidu(keyword, limit),
    searchSogou(keyword, limit),
  ]);

  const bing = bingResults.status === 'fulfilled' ? bingResults.value : [];
  const ddg = ddgResults.status === 'fulfilled' ? ddgResults.value : [];
  const baidu = baiduResults.status === 'fulfilled' ? baiduResults.value : [];
  const sogou = sogouResults.status === 'fulfilled' ? sogouResults.value : [];

  // 合并并去重（按标题相似度）
  const allResults = [...bing, ...baidu, ...ddg, ...sogou];
  const seen = new Set<string>();
  const deduped: TrendItem[] = [];

  for (const item of allResults) {
    // 简单去重：标题前30字符
    const key = item.title.slice(0, 30).toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(item);
    }
  }

  // 按热度排序
  deduped.sort((a, b) => b.score - a.score);

  // 新鲜度过滤：只保留7天内的内容（搜索引擎结果 createdAt 为抓取时间，
  // 但搜索引擎本身已通过 fresh 参数做了时间筛选，此处作为安全网）
  const freshResults = filterFreshItems(deduped);

  return freshResults.slice(0, limit);
}

/**
 * 获取AI相关热点（无需关键词）
 * TechCrunch 已移至 lib/sources/tech-news.ts
 */
export async function fetchAITrends(limit = 20): Promise<TrendItem[]> {
  const searchResults = await webSearch({ keyword: 'AI artificial intelligence', limit, fresh: 'day' });

  // 去重
  const seen = new Set<string>();
  const deduped: TrendItem[] = [];
  for (const item of searchResults) {
    const key = item.title.slice(0, 30).toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(item);
    }
  }

  deduped.sort((a, b) => b.score - a.score);
  return deduped.slice(0, limit);
}
