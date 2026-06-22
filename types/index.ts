// TypeScript 类型定义

export type SourceType = 'web-search' | 'twitter' | 'weibo' | 'zhihu' | 'tech-news' | 'toutiao';

/** 热点条目 */
export interface TrendItem {
  id: string;
  title: string;
  url: string;
  description?: string;
  score: number;           // 热度分数 (0-100)
  source: SourceType;
  sourceLabel: string;     // 显示名: '网页搜索' | 'Twitter'
  tags?: string[];         // AI 提取的标签
  author?: string;         // 作者 (Twitter)
  isFake?: boolean;        // AI 判断是否为虚假内容
  fakeReason?: string;     // 判断为虚假的原因
  matchedKeywords?: string[]; // 匹配到的关键词
  createdAt: string;       // 内容发布时间 (ISO)
  fetchedAt: string;       // 抓取时间 (ISO)
}

/** 监控关键词 */
export interface MonitorKeyword {
  id: string;
  keyword: string;
  scope?: 'all' | SourceType;
  active: boolean;
  createdAt: string;
  lastMatchedAt?: string;
}

/** 通知记录 */
export interface NotificationLog {
  id: string;
  keyword: string;
  trendTitle: string;
  trendUrl: string;
  source: SourceType;
  isFake: boolean;
  notifiedAt: string;
}

/** AI 匹配结果 */
export interface MatchResult {
  matched: boolean;
  confidence: number;
  reason: string;
}

/** AI 假内容检测结果 */
export interface FakeDetectResult {
  isFake: boolean;
  confidence: number;
  reason: string;
}

/** AI 摘要结果 */
export interface SummarizeResult {
  summary: string;
  topTopics: string[];
}

/** 监控配置 */
export interface MonitorConfig {
  interval: number;        // 轮询间隔（毫秒），默认 300000 (5分钟)
  keywords: MonitorKeyword[];
  sources: SourceType[];
  enabled: boolean;
}

/** 聚合热点请求参数 */
export interface TrendsRequest {
  q?: string;              // 搜索关键词
  sources?: SourceType[];  // 数据源筛选
  limit?: number;          // 返回数量限制
}

/** API 通用响应 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
