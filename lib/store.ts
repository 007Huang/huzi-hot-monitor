// localStorage 管理工具

import type { MonitorKeyword, NotificationLog, MonitorConfig, TrendsSnapshot } from '@/types';

const STORAGE_KEYS = {
  KEYWORDS: 'hot-monitor-keywords',
  NOTIFICATION_LOG: 'hot-monitor-notification-log',
  MONITOR_CONFIG: 'hot-monitor-config',
  LAST_FETCH: 'hot-monitor-last-fetch',
  NOTIFIED_IDS: 'hot-monitor-notified-ids',
  SIDEBAR_COLLAPSED: 'hot-monitor-sidebar-collapsed',
  TRENDS_SNAPSHOT: 'hot-monitor-trends-snapshot',
} as const;

/** 安全读取 localStorage */
function safeGet<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

/** 安全写入 localStorage */
function safeSet(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage 满了或不可用，静默失败
  }
}

// ===== 关键词管理 =====

export function getKeywords(): MonitorKeyword[] {
  return safeGet<MonitorKeyword[]>(STORAGE_KEYS.KEYWORDS, []);
}

export function saveKeywords(keywords: MonitorKeyword[]): void {
  safeSet(STORAGE_KEYS.KEYWORDS, keywords);
}

export function addKeyword(keyword: string, scope: MonitorKeyword['scope'] = 'all'): MonitorKeyword {
  const keywords = getKeywords();
  const newKeyword: MonitorKeyword = {
    id: crypto.randomUUID(),
    keyword: keyword.trim(),
    scope,
    active: true,
    createdAt: new Date().toISOString(),
  };
  keywords.push(newKeyword);
  saveKeywords(keywords);
  return newKeyword;
}

export function removeKeyword(id: string): void {
  const keywords = getKeywords().filter(k => k.id !== id);
  saveKeywords(keywords);
}

export function toggleKeyword(id: string): void {
  const keywords = getKeywords().map(k =>
    k.id === id ? { ...k, active: !k.active } : k
  );
  saveKeywords(keywords);
}

export function updateKeywordLastMatched(id: string): void {
  const keywords = getKeywords().map(k =>
    k.id === id ? { ...k, lastMatchedAt: new Date().toISOString() } : k
  );
  saveKeywords(keywords);
}

// ===== 通知记录 =====

export function getNotificationLogs(): NotificationLog[] {
  return safeGet<NotificationLog[]>(STORAGE_KEYS.NOTIFICATION_LOG, []);
}

export function addNotificationLog(log: Omit<NotificationLog, 'id' | 'notifiedAt'>): void {
  const logs = getNotificationLogs();
  logs.unshift({
    ...log,
    id: crypto.randomUUID(),
    notifiedAt: new Date().toISOString(),
  });
  // 只保留最近 100 条
  saveNotificationLogs(logs.slice(0, 100));
}

export function saveNotificationLogs(logs: NotificationLog[]): void {
  safeSet(STORAGE_KEYS.NOTIFICATION_LOG, logs);
}

// ===== 通知已读状态 =====

export function markNotificationRead(id: string): void {
  const logs = getNotificationLogs();
  const updated = logs.map(log =>
    log.id === id ? { ...log, readAt: new Date().toISOString() } : log
  );
  saveNotificationLogs(updated);
}

export function markAllNotificationsRead(): void {
  const logs = getNotificationLogs();
  const updated = logs.map(log =>
    log.readAt ? log : { ...log, readAt: new Date().toISOString() }
  );
  saveNotificationLogs(updated);
}

export function getUnreadNotificationCount(): number {
  const logs = getNotificationLogs();
  return logs.filter(log => !log.readAt).length;
}

// ===== 已通知ID集合（避免重复通知） =====

export function getNotifiedIds(): Set<string> {
  const ids = safeGet<string[]>(STORAGE_KEYS.NOTIFIED_IDS, []);
  return new Set(ids);
}

export function addNotifiedId(id: string): void {
  const ids = safeGet<string[]>(STORAGE_KEYS.NOTIFIED_IDS, []);
  if (!ids.includes(id)) {
    ids.push(id);
    // 只保留最近 500 个
    safeSet(STORAGE_KEYS.NOTIFIED_IDS, ids.slice(-500));
  }
}

// ===== 监控配置 =====

const DEFAULT_CONFIG: MonitorConfig = {
  interval: 5 * 60 * 1000, // 5分钟
  keywords: [],
  sources: ['web-search', 'twitter', 'weibo', 'zhihu', 'tech-news', 'toutiao'],
  enabled: false,
};

export function getMonitorConfig(): MonitorConfig {
  return safeGet<MonitorConfig>(STORAGE_KEYS.MONITOR_CONFIG, DEFAULT_CONFIG);
}

export function saveMonitorConfig(config: Partial<MonitorConfig>): void {
  const current = getMonitorConfig();
  safeSet(STORAGE_KEYS.MONITOR_CONFIG, { ...current, ...config });
}

// ===== 侧边栏折叠状态 =====

export function getSidebarCollapsed(): boolean {
  return safeGet<boolean>(STORAGE_KEYS.SIDEBAR_COLLAPSED, false);
}

export function saveSidebarCollapsed(collapsed: boolean): void {
  safeSet(STORAGE_KEYS.SIDEBAR_COLLAPSED, collapsed);
}

// ===== 上次抓取时间 =====

export function getLastFetchTime(keyword: string, source: string): string | null {
  const map = safeGet<Record<string, string>>(STORAGE_KEYS.LAST_FETCH, {});
  const key = `${source}:${keyword}`;
  return map[key] || null;
}

export function setLastFetchTime(keyword: string, source: string): void {
  const map = safeGet<Record<string, string>>(STORAGE_KEYS.LAST_FETCH, {});
  const key = `${source}:${keyword}`;
  map[key] = new Date().toISOString();
  safeSet(STORAGE_KEYS.LAST_FETCH, map);
}

// ===== 趋势快照（用于方向对比） =====

export function getTrendsSnapshot(): TrendsSnapshot | null {
  return safeGet<TrendsSnapshot | null>(STORAGE_KEYS.TRENDS_SNAPSHOT, null);
}

export function saveTrendsSnapshot(snapshot: TrendsSnapshot): void {
  safeSet(STORAGE_KEYS.TRENDS_SNAPSHOT, snapshot);
}
