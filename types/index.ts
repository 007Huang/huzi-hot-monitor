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
  direction?: TrendDirection; // 热度变化方向
  previousScore?: number;     // 上次热度分
  interactions?: {            // 互动数据（Twitter/微博等有的话则填充）
    likes?: number;
    retweets?: number;
    replies?: number;
    views?: number;
  };
  matchReason?: string;       // AI 匹配相关性理由
  matchRelationType?: 'explicit' | 'semantic';  // AI 匹配类型（仅匹配时设置）
  localMatchReason?: string;  // 本地关键词匹配理由
  aiSummary?: string;         // AI 生成的简短摘要
  createdAt: string;       // 内容发布时间 (ISO)
  fetchedAt: string;       // 抓取时间 (ISO)
}

/** 监控关键词 */
export interface MonitorKeyword {
  id: string;
  keyword: string;
  scope?: SourceType | 'all';
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
  readAt?: string;            // ISO timestamp when marked as read; undefined = unread
}

/** AI 匹配结果 */
export interface MatchResult {
  matched: boolean;
  confidence: number;
  reason: string;
  matchedKeywords?: string[];      // 实际匹配到的关键词
  relationType?: 'explicit' | 'semantic' | 'unrelated';  // 匹配类型
}

/** 查询扩展结果 */
export interface ExpandedQuery {
  original: string;       // 原始关键词
  variants: string[];     // 扩展变体
  expandedAt: string;     // ISO 时间戳
}

/** 自评估测试用例 */
export interface EvalTestCase {
  id: string;
  keyword: string;
  title: string;
  description: string;
  expectedMatch: boolean;
  expectedRelationType?: 'explicit' | 'semantic' | 'unrelated';
}

/** 自评估结果 */
export interface EvalResult {
  keyword: string;
  timestamp: string;
  totalCases: number;
  truePositives: number;
  falsePositives: number;
  trueNegatives: number;
  falseNegatives: number;
  precision: number;
  recall: number;
  accuracy: number;
  details: Array<{
    caseId: string;
    aiMatched: boolean;
    aiRelationType?: string;
    expectedMatch: boolean;
    correct: boolean;
  }>;
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

/** 趋势热度变化方向 */
export type TrendDirection = 'up' | 'down' | 'stable' | 'new';

/** 趋势快照（用于方向对比） */
export interface TrendsSnapshot {
  timestamp: string;
  items: Array<{ id: string; score: number; title: string }>;
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
