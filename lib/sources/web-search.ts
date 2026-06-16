// 网页搜索爬虫 - 使用 fetch + cheerio 从搜索引擎和科技站点获取热点
import * as cheerio from 'cheerio';
import type { TrendItem, SourceType } from '@/types';
import { createHash } from 'crypto';

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
      q: `${keyword} latest`,
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
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(keyword + ' latest news')}`;
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
 * 科技站点专用爬虫 - TechCrunch AI
 */
async function fetchTechCrunchAI(limit = 10): Promise<TrendItem[]> {
  const cacheKey = 'techcrunch-ai';
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.time < CACHE_TTL) {
    return cached.results.slice(0, limit);
  }

  try {
    const res = await fetch('https://techcrunch.com/category/artificial-intelligence/', {
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

    $('article.post-block').each((_, el) => {
      if (results.length >= limit) return;

      const titleEl = $(el).find('h2 a');
      const title = titleEl.text().trim();
      const url = titleEl.attr('href') || '';
      const description = $(el).find('.post-block__content').text().trim();

      if (title && url) {
        results.push({
          id: generateId('tc', url),
          title,
          url,
          description: description.slice(0, 200),
          score: 70 + Math.floor(Math.random() * 25),
          source: 'web-search' as SourceType,
          sourceLabel: 'TechCrunch',
          tags: ['AI'],
          createdAt: now,
          fetchedAt: now,
        });
      }
    });

    searchCache.set(cacheKey, { time: Date.now(), results });
    return results;
  } catch (error) {
    console.error('TechCrunch fetch error:', error);
    return [];
  }
}

/**
 * 聚合搜索 - 从多个搜索引擎获取并合并去重
 */
export async function webSearch(options: SearchOptions): Promise<TrendItem[]> {
  const { keyword, limit = 20 } = options;

  // 并行搜索多个源
  const [bingResults, ddgResults] = await Promise.allSettled([
    searchBing(options),
    searchDuckDuckGo(options),
  ]);

  const bing = bingResults.status === 'fulfilled' ? bingResults.value : [];
  const ddg = ddgResults.status === 'fulfilled' ? ddgResults.value : [];

  // 合并并去重（按标题相似度）
  const allResults = [...bing, ...ddg];
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
  return deduped.slice(0, limit);
}

/**
 * 获取AI相关热点（无需关键词）
 */
export async function fetchAITrends(limit = 20): Promise<TrendItem[]> {
  const [searchResults, techCrunchResults] = await Promise.allSettled([
    webSearch({ keyword: 'AI artificial intelligence', limit, fresh: 'day' }),
    fetchTechCrunchAI(limit),
  ]);

  const search = searchResults.status === 'fulfilled' ? searchResults.value : [];
  const tc = techCrunchResults.status === 'fulfilled' ? techCrunchResults.value : [];

  const allResults = [...tc, ...search];

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

  deduped.sort((a, b) => b.score - a.score);
  return deduped.slice(0, limit);
}
