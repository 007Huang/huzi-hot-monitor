/**
 * Query Expansion（查询扩展）
 *
 * 核心思想：将用户原始关键词自动扩展为多个语义相近的变体查询，
 * 从而提高检索的召回率，同时配合基础文本匹配过滤保证精确率。
 *
 * 例如："鱼皮的AI导航" → ["鱼皮的AI导航", "程序员鱼皮的AI导航", "AI导航鱼皮", "鱼皮AI编程教程"]
 *
 * 缓存策略：1 小时内存缓存，最多 100 个条目，LRU 淘汰
 */

import { callAI } from './ai';

// ===== 缓存 =====

interface CacheEntry {
  variants: string[];
  cachedAt: number;
  ttl: number;
}

const expansionCache = new Map<string, CacheEntry>();
const CACHE_TTL = 60 * 60 * 1000; // 1 小时
const MAX_CACHE_SIZE = 100;

function trimCache(): void {
  if (expansionCache.size <= MAX_CACHE_SIZE) return;
  const entries = [...expansionCache.entries()]
    .sort((a, b) => a[1].cachedAt - b[1].cachedAt);
  const toDelete = entries.slice(0, entries.length - MAX_CACHE_SIZE);
  for (const [key] of toDelete) {
    expansionCache.delete(key);
  }
}

// ===== 公开 API =====

/**
 * 扩展单个关键词为多个语义相近的搜索查询变体
 * 结果按关键词小写缓存 1 小时
 */
export async function expandKeyword(keyword: string): Promise<string[]> {
  const lower = keyword.toLowerCase().trim();

  // 检查缓存
  const cached = expansionCache.get(lower);
  if (cached && Date.now() - cached.cachedAt < cached.ttl) {
    return cached.variants;
  }

  // 短词（1-2 字符）跳过 AI 扩展
  if (lower.length <= 2) {
    const result = [keyword];
    expansionCache.set(lower, { variants: result, cachedAt: Date.now(), ttl: CACHE_TTL });
    trimCache();
    return result;
  }

  try {
    const variants = await requestExpansion(keyword);
    // 始终包含原始关键词
    const allVariants = [keyword, ...variants.filter(v => v.toLowerCase() !== lower)];
    const unique = [...new Set(allVariants)];

    expansionCache.set(lower, { variants: unique, cachedAt: Date.now(), ttl: CACHE_TTL });
    trimCache();
    return unique;
  } catch (error) {
    console.error(`Query expansion failed for "${keyword}":`, error);
    // 失败回退：仅返回原始关键词
    return [keyword];
  }
}

/**
 * 并行扩展多个关键词
 * 返回 Map<originalKeyword, variants[]>
 */
export async function expandKeywords(
  keywords: string[]
): Promise<Map<string, string[]>> {
  const uniqueKeywords = [...new Set(keywords.map(k => k.trim()).filter(Boolean))];
  const results = await Promise.allSettled(
    uniqueKeywords.map(async kw => {
      const variants = await expandKeyword(kw);
      return [kw, variants] as const;
    })
  );

  const map = new Map<string, string[]>();
  for (const result of results) {
    if (result.status === 'fulfilled') {
      map.set(result.value[0], result.value[1]);
    }
  }
  return map;
}

/**
 * 清除扩展缓存（用于测试或手动刷新）
 */
export function clearExpansionCache(): void {
  expansionCache.clear();
}

/**
 * 获取所有扩展查询的扁平数组（去重）
 */
export function flattenExpandedQueries(map: Map<string, string[]>): string[] {
  const all: string[] = [];
  for (const variants of map.values()) {
    all.push(...variants);
  }
  return [...new Set(all)];
}

// ===== 内部：AI 调用 =====

async function requestExpansion(keyword: string): Promise<string[]> {
  const systemPrompt = `你是一个搜索查询扩展专家。你的任务是将用户的关键词扩展为多个语义相似的搜索查询变体。

规则：
1. 扩展后的查询必须与原始关键词在语义上高度相关
2. 每个变体应该捕捉原始关键词的不同表达方式
3. 对于中文关键词：考虑同义词、不同语序、常见组合短语
4. 对于英文/技术关键词：考虑缩写、全称、相关产品名
5. 生成 2-5 个变体
6. 不要添加无关内容
7. 保持变体简洁（不超过原始关键词长度的 2 倍）

示例：
- "鱼皮的AI导航" → ["程序员鱼皮的AI导航", "AI导航网站鱼皮", "鱼皮AI工具导航", "鱼皮编程导航"]
- "Claude Sonnet 4.6" → ["Claude 4.6 Sonnet", "Claude Sonnet 4.6发布", "Anthropic Sonnet 4.6", "Claude 新版本 4.6"]
- "GPT-5" → ["GPT5", "GPT-5发布", "OpenAI GPT-5", "ChatGPT 5"]

返回 JSON 数组，如 ["v1", "v2", "v3"]
只返回 JSON 数组，不要其他内容。`;

  const userPrompt = `关键词：${keyword}`;

  const raw = await callAI(systemPrompt, userPrompt, 300);
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const parsed = JSON.parse(cleaned) as string[];
  return Array.isArray(parsed) ? parsed : [];
}
