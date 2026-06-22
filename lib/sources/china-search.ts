// 国内搜索引擎爬虫 - 百度 + 搜狗
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

function generateId(prefix: string, url: string): string {
  const hash = createHash('md5').update(url).digest('hex').slice(0, 12);
  return `${prefix}-${hash}`;
}

const searchCache = new Map<string, { time: number; results: TrendItem[] }>();
const CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存

/**
 * 百度搜索爬虫
 */
export async function searchBaidu(keyword: string, limit = 10): Promise<TrendItem[]> {
  const cacheKey = `baidu:${keyword}`;
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.time < CACHE_TTL) {
    return cached.results.slice(0, limit);
  }

  try {
    // 加时间过滤：gpc 参数限定最近7天，与项目新鲜度窗口一致
    const tsNow = Date.now();
    const sevenDaysAgo = tsNow - 7 * 24 * 60 * 60 * 1000;
    const gpc = encodeURIComponent(`stf=${Math.floor(sevenDaysAgo / 1000)},${Math.floor(tsNow / 1000)}|stftype=1`);
    const url = `https://www.baidu.com/s?wd=${encodeURIComponent(keyword)}&rn=20&gpc=${gpc}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': getRandomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'zh-CN,zh;q=0.9',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      console.error(`Baidu search failed: ${res.status}`);
      return [];
    }

    const html = await res.text();
    const $ = cheerio.load(html);
    const results: TrendItem[] = [];
    const now = new Date().toISOString();

    // 百度搜索结果在 #content_left 下
    $('#content_left .result, #content_left .c-container').each((_, el) => {
      if (results.length >= limit) return;

      // 标题通常在 h3 a 中
      const titleEl = $(el).find('h3 a').first();
      const title = titleEl.text().trim();
      // 百度的链接可能是跳转链接，尝试获取真实 URL
      let linkUrl = titleEl.attr('href') || '';
      // 尝试从 data-url 或 mu 属性获取真实链接
      const realUrl = $(el).attr('data-url') || $(el).attr('mu') || '';
      if (realUrl && realUrl.startsWith('http')) {
        linkUrl = realUrl;
      }
      // 描述
      const description = $(el).find('.c-abstract, .content-right_8Zs40, span.content-right_8Zs40').text().trim();

      if (title && linkUrl) {
        // 确保URL有协议
        const finalUrl = linkUrl.startsWith('http') ? linkUrl : `https://${linkUrl}`;
        results.push({
          id: generateId('baidu', finalUrl + title),
          title,
          url: finalUrl,
          description: description.slice(0, 200),
          score: 50 + Math.floor(Math.random() * 30),
          source: 'web-search' as SourceType,
          sourceLabel: '百度',
          createdAt: now,
          fetchedAt: now,
        });
      }
    });

    searchCache.set(cacheKey, { time: Date.now(), results });
    return results;
  } catch (error) {
    console.error('Baidu search error:', error);
    return [];
  }
}

/**
 * 搜狗搜索爬虫
 */
export async function searchSogou(keyword: string, limit = 10): Promise<TrendItem[]> {
  const cacheKey = `sogou:${keyword}`;
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.time < CACHE_TTL) {
    return cached.results.slice(0, limit);
  }

  try {
    const url = `https://www.sogou.com/web?query=${encodeURIComponent(keyword)}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': getRandomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'zh-CN,zh;q=0.9',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      console.error(`Sogou search failed: ${res.status}`);
      return [];
    }

    const html = await res.text();
    const $ = cheerio.load(html);
    const results: TrendItem[] = [];
    const now = new Date().toISOString();

    // 搜狗搜索结果
    $('.results .vrwrap, .results .rb').each((_, el) => {
      if (results.length >= limit) return;

      const titleEl = $(el).find('h3 a').first();
      const title = titleEl.text().trim();
      let linkUrl = titleEl.attr('href') || '';
      const description = $(el).find('.str-text-info, .str_info, .space-txt').text().trim();

      if (title && linkUrl) {
        // 搜狗链接可能是相对路径
        const finalUrl = linkUrl.startsWith('http') ? linkUrl : `https://www.sogou.com${linkUrl}`;
        results.push({
          id: generateId('sogou', finalUrl + title),
          title,
          url: finalUrl,
          description: description.slice(0, 200),
          score: 40 + Math.floor(Math.random() * 30),
          source: 'web-search' as SourceType,
          sourceLabel: '搜狗',
          createdAt: now,
          fetchedAt: now,
        });
      }
    });

    searchCache.set(cacheKey, { time: Date.now(), results });
    return results;
  } catch (error) {
    console.error('Sogou search error:', error);
    return [];
  }
}
