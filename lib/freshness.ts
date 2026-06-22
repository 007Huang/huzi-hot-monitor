// 新鲜度过滤 - 热点监控的核心策略
// 超过指定天数的内容自动丢弃
// 原因：
//   1. 热点有强烈时效性，旧内容不再是"热点"
//   2. 搜索引擎返回的结果中可能包含很多旧文章
//   3. 过滤旧内容可以显著减少AI分析的负担（节省API调用成本）

/** 默认新鲜度窗口：7 天 */
const FRESHNESS_WINDOW_DAYS = 7;

/**
 * 判断内容是否在新鲜度窗口内
 * @param dateStr ISO 格式的时间字符串
 * @param maxDays 最大天数，默认 7 天
 * @returns true 表示内容新鲜，应保留
 */
export function isFresh(dateStr: string, maxDays = FRESHNESS_WINDOW_DAYS): boolean {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return true; // 解析失败时保留（宁可多留，不要误删）

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    return diffDays <= maxDays;
  } catch {
    return true; // 异常时保留
  }
}

/**
 * 过滤掉超过新鲜度窗口的条目
 * @param items 带有 createdAt 字段的条目数组
 * @param maxDays 最大天数，默认 7 天
 * @returns 过滤后的数组
 */
export function filterFreshItems<T extends { createdAt: string }>(items: T[], maxDays?: number): T[] {
  return items.filter(item => isFresh(item.createdAt, maxDays));
}
