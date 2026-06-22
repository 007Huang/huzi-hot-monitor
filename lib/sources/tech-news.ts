// 科技新闻源 - 36氪 + TechCrunch
import * as cheerio from 'cheerio';
import type { TrendItem, SourceType } from '@/types';
import { createHash } from 'crypto';

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

/**
 * 36氪快讯
 */
export async function fetch36kr(limit = 15): Promise<TrendItem[]> {
  const cacheKey = '36kr';
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.time < CACHE_TTL) {
    return cached.results.slice(0, limit);
  }

  try {
    // 优先尝试 JSON API
    const res = await fetch('https://36kr.com/api/search-column/mainsite?per_page=20&page=1', {
      headers: {
        'User-Agent': getRandomUserAgent(),
        'Accept': 'application/json',
        'Referer': 'https://36kr.com/',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (res.ok) {
      const data = await res.json();
      const items = data?.data?.items || [];
      const now = new Date().toISOString();

      const results: TrendItem[] = items.map((item: Record<string, unknown>, idx: number) => {
        const title = (item.title || item.widget_title || '') as string;
        const id = (item.id || String(idx)) as string;
        const summary = (item.summary || '') as string;
        const createdAt = (item.published_at || item.created_at || now) as string;

        return {
          id: `36kr-${id}`,
          title,
          url: `https://36kr.com/p/${id}`,
          description: summary.slice(0, 200),
          score: 60 + Math.floor(Math.random() * 25),
          source: 'tech-news' as SourceType,
          sourceLabel: '36氪',
          createdAt,
          fetchedAt: now,
        };
      });

      searchCache.set(cacheKey, { time: Date.now(), results });
      return results.slice(0, limit);
    }

    // JSON API 失败，回退 HTML 解析
    return await fetch36krHTML(limit);
  } catch (error) {
    console.error('36kr fetch error:', error);
    return await fetch36krHTML(limit);
  }
}

/**
 * 36氪 - HTML 解析（回退方案）
 */
async function fetch36krHTML(limit: number): Promise<TrendItem[]> {
  try {
    const res = await fetch('https://36kr.com/newsflashes', {
      headers: {
        'User-Agent': getRandomUserAgent(),
        'Accept': 'text/html',
        'Accept-Language': 'zh-CN,zh;q=0.9',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) return [];

    const html = await res.text();
    const $ = cheerio.load(html);
    const results: TrendItem[] = [];
    const now = new Date().toISOString();

    $('.article-item-title, .hotlist-main-title').each((_, el) => {
      if (results.length >= limit) return;

      const title = $(el).text().trim();
      const linkEl = $(el).closest('a').first();
      let url = linkEl.attr('href') || '';

      if (title) {
        if (url && !url.startsWith('http')) {
          url = `https://36kr.com${url}`;
        }
        results.push({
          id: generateId('36kr', url || title),
          title,
          url: url || `https://36kr.com/search/articles/${encodeURIComponent(title)}`,
          description: '',
          score: 60 + Math.floor(Math.random() * 25),
          source: 'tech-news' as SourceType,
          sourceLabel: '36氪',
          createdAt: now,
          fetchedAt: now,
        });
      }
    });

    searchCache.set('36kr', { time: Date.now(), results });
    return results;
  } catch {
    return [];
  }
}

/**
 * TechCrunch AI 新闻
 */
export async function fetchTechCrunchAI(limit = 10): Promise<TrendItem[]> {
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
          source: 'tech-news' as SourceType,
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
 * 聚合科技新闻
 */
export async function fetchTechNews(limit = 20): Promise<TrendItem[]> {
  const [kr36Results, tcResults] = await Promise.allSettled([
    fetch36kr(limit),
    fetchTechCrunchAI(limit),
  ]);

  const kr36 = kr36Results.status === 'fulfilled' ? kr36Results.value : [];
  const tc = tcResults.status === 'fulfilled' ? tcResults.value : [];

  const allResults = [...kr36, ...tc];

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
