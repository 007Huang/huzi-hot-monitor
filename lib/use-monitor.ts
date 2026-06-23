'use client';

// 监控调度 Hook - 客户端轮询 + 变化检测 + 关键词匹配 + 通知

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import type { TrendItem, MonitorKeyword, SummarizeResult, TrendDirection, TrendsSnapshot } from '@/types';
import {
  addNotifiedId,
  addNotificationLog,
  getNotifiedIds,
  getKeywords,
  getMonitorConfig,
  saveMonitorConfig,
  getUnreadNotificationCount,
  getTrendsSnapshot,
  saveTrendsSnapshot,
} from '@/lib/store';

// ===== 排序和筛选类型 =====
export type SortBy = 'score' | 'time' | 'source' | 'title';
export type SortOrder = 'desc' | 'asc';
export type ShowFake = 'all' | 'fake' | 'real';
export type MatchFilter = 'all' | 'matched' | 'unmatched';
export type TimeRange = '1h' | '6h' | '24h' | '7d' | 'all';

export interface MatchedKeywordSummary {
  keyword: string;
  count: number;
}

interface UseMonitorReturn {
  trends: TrendItem[];
  isLoading: boolean;
  aiSummary: SummarizeResult | null;
  monitorEnabled: boolean;
  lastCheckAt: string | undefined;
  sourceFilter: string;
  keywords: MonitorKeyword[];
  fetchTrends: () => Promise<void>;
  fetchSummary: (trendData: TrendItem[]) => Promise<void>;
  toggleMonitor: () => void;
  setSourceFilter: (filter: string) => void;
  handleKeywordsChange: (keywords: MonitorKeyword[]) => void;
  handleDetectFake: (trend: TrendItem) => Promise<void>;
  isDetecting: boolean;
  totalTrends: number;
  keywordMatchCount: number;
  fakeWarningCount: number;
  sourceCoverage: { current: number; total: number };
  unreadCount: number;
  refreshUnreadCount: () => void;
  notificationVersion: number;
  // 排序
  sortBy: SortBy;
  setSortBy: (sort: SortBy) => void;
  sortOrder: SortOrder;
  setSortOrder: (order: SortOrder) => void;
  // 筛选
  scoreRange: [number, number];
  setScoreRange: (range: [number, number]) => void;
  showFake: ShowFake;
  setShowFake: (filter: ShowFake) => void;
  matchFilter: MatchFilter;
  setMatchFilter: (filter: MatchFilter) => void;
  timeRange: TimeRange;
  setTimeRange: (range: TimeRange) => void;
  // 关键词过滤
  keywordFilter: string | null;
  setKeywordFilter: (keyword: string | null) => void;
  // 当前趋势中所有匹配到的关键词汇总
  matchedKeywordList: MatchedKeywordSummary[];
  // 计算结果
  displayedTrends: TrendItem[];
}

// ===== 趋势方向计算 =====

function computeTrendDirections(
  currentTrends: TrendItem[],
  snapshot: TrendsSnapshot | null
): TrendItem[] {
  if (!snapshot) {
    return currentTrends.map(t => ({ ...t, direction: 'new' as TrendDirection }));
  }

  const snapshotMap = new Map(snapshot.items.map(item => [item.id, item.score]));

  return currentTrends.map(trend => {
    const prevScore = snapshotMap.get(trend.id);
    if (prevScore === undefined) {
      return { ...trend, direction: 'new' as TrendDirection };
    }
    const diff = trend.score - prevScore;
    let direction: TrendDirection;
    if (diff >= 10) direction = 'up';
    else if (diff <= -10) direction = 'down';
    else direction = 'stable';

    return { ...trend, direction, previousScore: prevScore };
  });
}

// ===== 本地关键词匹配（子串匹配，填充 matchedKeywords） =====

function matchKeywordsLocally(
  trends: TrendItem[],
  activeKeywords: MonitorKeyword[]
): TrendItem[] {
  if (activeKeywords.length === 0) return trends;
  const keywordStrings = activeKeywords.map(k => k.keyword.toLowerCase());

  return trends.map(trend => {
    const text = `${trend.title} ${trend.description || ''}`.toLowerCase();
    const matched = keywordStrings.filter(kw => text.includes(kw));
    return matched.length > 0
      ? { ...trend, matchedKeywords: matched.map(k => activeKeywords.find(ak => ak.keyword.toLowerCase() === k)?.keyword || k) }
      : trend;
  });
}

// ===== 使用 Monitor Hook =====

export function useMonitor(): UseMonitorReturn {
  const [trends, setTrends] = useState<TrendItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sourceFilter, setSourceFilter] = useState('all');
  const [monitorEnabled, setMonitorEnabled] = useState(false);
  const [lastCheckAt, setLastCheckAt] = useState<string>();
  const [aiSummary, setAiSummary] = useState<SummarizeResult | null>(null);
  const [keywords, setKeywords] = useState<MonitorKeyword[]>(() => getKeywords());
  const [isDetecting, setIsDetecting] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationVersion, setNotificationVersion] = useState(0);
  const monitorTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialMount = useRef(true);

  // 排序状态
  const [sortBy, setSortBy] = useState<SortBy>('score');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // 筛选状态
  const [scoreRange, setScoreRange] = useState<[number, number]>([0, 100]);
  const [showFake, setShowFake] = useState<ShowFake>('all');
  const [matchFilter, setMatchFilter] = useState<MatchFilter>('all');
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  // 关键词过滤：点击关键词后只显示该关键词匹配的趋势
  const [keywordFilter, setKeywordFilter] = useState<string | null>(null);

  // Computed stats
  const totalTrends = trends.length;
  const keywordMatchCount = useMemo(
    () => trends.filter(t => t.matchedKeywords && t.matchedKeywords.length > 0).length,
    [trends]
  );
  const fakeWarningCount = useMemo(
    () => trends.filter(t => t.isFake).length,
    [trends]
  );
  const sourceCoverage = useMemo(() => {
    const uniqueSources = new Set(trends.map(t => t.source));
    return { current: uniqueSources.size, total: 6 };
  }, [trends]);

  // 当前趋势中所有匹配到的关键词汇总
  const matchedKeywordList: MatchedKeywordSummary[] = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of trends) {
      if (t.matchedKeywords) {
        for (const kw of t.matchedKeywords) {
          map.set(kw, (map.get(kw) || 0) + 1);
        }
      }
    }
    return Array.from(map.entries())
      .map(([keyword, count]) => ({ keyword, count }))
      .sort((a, b) => b.count - a.count);
  }, [trends]);

  // 排序计算
  const sortedTrends = useMemo(() => {
    const sorted = [...trends];
    switch (sortBy) {
      case 'score':
        sorted.sort((a, b) => sortOrder === 'desc' ? b.score - a.score : a.score - b.score);
        break;
      case 'time':
        sorted.sort((a, b) => {
          const diff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          return sortOrder === 'desc' ? diff : -diff;
        });
        break;
      case 'source':
        sorted.sort((a, b) => a.source.localeCompare(b.source) || b.score - a.score);
        break;
      case 'title':
        sorted.sort((a, b) => a.title.localeCompare(b.title));
        break;
    }
    return sorted;
  }, [trends, sortBy, sortOrder]);

  // 筛选计算
  const displayedTrends = useMemo(() => {
    let result = sortedTrends;
    // 1. 源筛选
    if (sourceFilter !== 'all') {
      result = result.filter(t => t.source === sourceFilter);
    }
    // 2. 热度区间
    result = result.filter(t => t.score >= scoreRange[0] && t.score <= scoreRange[1]);
    // 3. 虚假过滤
    if (showFake === 'fake') {
      result = result.filter(t => t.isFake);
    } else if (showFake === 'real') {
      result = result.filter(t => !t.isFake);
    }
    // 4. 关键词匹配
    if (matchFilter === 'matched') {
      result = result.filter(t => t.matchedKeywords && t.matchedKeywords.length > 0);
    } else if (matchFilter === 'unmatched') {
      result = result.filter(t => !t.matchedKeywords || t.matchedKeywords.length === 0);
    }
    // 4.5 特定关键词过滤（点击关键词时）
    if (keywordFilter) {
      result = result.filter(t =>
        t.matchedKeywords && t.matchedKeywords.some(k => k.toLowerCase().includes(keywordFilter.toLowerCase()))
      );
    }
    // 5. 时间范围
    if (timeRange !== 'all') {
      const now = Date.now();
      const ms: Record<string, number> = { '1h': 3600000, '6h': 21600000, '24h': 86400000, '7d': 604800000 };
      const cutoff = now - (ms[timeRange] || ms['7d']);
      result = result.filter(t => new Date(t.createdAt).getTime() > cutoff);
    }
    return result;
  }, [sortedTrends, sourceFilter, scoreRange, showFake, matchFilter, keywordFilter, timeRange]);

  // 获取热点数据
  const fetchTrends = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (sourceFilter !== 'all') params.set('sources', sourceFilter);
      params.set('limit', '100');

      const activeKeywords = keywords.filter(k => k.active);
      if (activeKeywords.length > 0) {
        params.set('q', activeKeywords.map(k => k.keyword).join(' OR '));
      }

      const res = await fetch(`/api/trends?${params.toString()}`);
      const data = await res.json();

      if (data.success && data.data) {
        // 读取上次快照用于方向对比
        const prevSnapshot = getTrendsSnapshot();
        const withDirection = computeTrendDirections(data.data, prevSnapshot);

        // 本地文本匹配：用活跃关键词对趋势做子串匹配，填充 matchedKeywords
        const withMatching = matchKeywordsLocally(withDirection, activeKeywords);

        // 保存本次数据为快照（供下回方向对比）
        const snapshot: TrendsSnapshot = {
          timestamp: new Date().toISOString(),
          items: withMatching.map((t: TrendItem) => ({ id: t.id, score: t.score, title: t.title })),
        };
        saveTrendsSnapshot(snapshot);

        setTrends(withMatching);
        setLastCheckAt(data.meta?.fetchedAt || new Date().toISOString());

        // 如果监控开启，进行 AI 关键词匹配和通知
        if (monitorEnabled && activeKeywords.length > 0) {
          await processKeywordMatching(data.data, activeKeywords);
        }
      }
    } catch (error) {
      console.error('Fetch trends error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [sourceFilter, keywords, monitorEnabled]);

  // AI 摘要
  const fetchSummary = useCallback(async (trendData: TrendItem[]) => {
    if (trendData.length === 0) return;
    try {
      const res = await fetch('/api/ai/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trends: trendData.slice(0, 10) }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setAiSummary(data.data);
      }
    } catch (error) {
      console.error('Fetch summary error:', error);
    }
  }, []);

  // 关键词匹配 + 通知
  const processKeywordMatching = async (
    trendData: TrendItem[],
    activeKeywords: MonitorKeyword[]
  ) => {
    const notifiedIds = getNotifiedIds();

    for (const trend of trendData) {
      if (notifiedIds.has(trend.id)) continue;

      // 过滤出 scope 匹配当前源的关键词
      const scopeMatchedKeywords = activeKeywords.filter(k => {
        if (k.scope && k.scope !== 'all' && k.scope !== trend.source) return false;
        return true;
      });

      if (scopeMatchedKeywords.length === 0) continue;

      const keywordStrings = scopeMatchedKeywords.map(k => k.keyword);

      try {
        const matchRes = await fetch('/api/ai/match', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: trend.title,
            description: trend.description,
            keywords: keywordStrings,
          }),
        });
        const matchData = await matchRes.json();

        if (matchData.success && matchData.data?.matched) {
          // 发送浏览器通知
          sendBrowserNotification(
            `🔥 热点匹配: ${trend.title}`,
            `关键词 "${keywordStrings.join(', ')}" 匹配到新热点`,
            trend.url
          );

          // 尝试发送邮件通知
          const email = process.env.NEXT_PUBLIC_NOTIFY_EMAIL;
          if (email) {
            fetch('/api/notify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'match',
                keyword: keywordStrings.join(', '),
                trend,
              }),
            }).catch(() => {}); // 静默失败
          }

          // 记录
          addNotifiedId(trend.id);
          addNotificationLog({
            keyword: keywordStrings.join(', '),
            trendTitle: trend.title,
            trendUrl: trend.url,
            source: trend.source,
            isFake: false,
          });
          setNotificationVersion(v => v + 1);
        }
      } catch (error) {
        console.error('Keyword matching error:', error);
      }
    }
  };

  // 浏览器通知
  const sendBrowserNotification = (title: string, body: string, url?: string) => {
    if (typeof window === 'undefined') return;
    if (Notification.permission !== 'granted') {
      Notification.requestPermission();
      return;
    }
    const notification = new Notification(title, {
      body,
      icon: '/favicon.ico',
    });
    notification.onclick = () => {
      window.focus();
      if (url) window.open(url);
    };
  };

  // AI 假内容检测
  const handleDetectFake = async (trend: TrendItem) => {
    setIsDetecting(true);
    try {
      const res = await fetch('/api/ai/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: trend.title,
          description: trend.description,
          url: trend.url,
        }),
      });
      const data = await res.json();

      if (data.success && data.data) {
        const updatedTrends = trends.map(t =>
          t.id === trend.id
            ? { ...t, isFake: data.data.isFake, fakeReason: data.data.reason }
            : t
        );
        setTrends(updatedTrends);
      }
    } catch (error) {
      console.error('Detect fake error:', error);
    } finally {
      setIsDetecting(false);
    }
  };

  // 切换监控
  const toggleMonitor = () => {
    const config = getMonitorConfig();

    if (monitorEnabled) {
      if (monitorTimerRef.current) {
        clearInterval(monitorTimerRef.current);
        monitorTimerRef.current = null;
      }
      setMonitorEnabled(false);
      saveMonitorConfig({ enabled: false });
    } else {
      // 请求通知权限
      if (typeof window !== 'undefined' && Notification.permission === 'default') {
        Notification.requestPermission();
      }
      setMonitorEnabled(true);
      saveMonitorConfig({ enabled: true });
      fetchTrends(); // 立即执行一次
      monitorTimerRef.current = setInterval(fetchTrends, config.interval || 5 * 60 * 1000);
    }
  };

  // 关键词变化
  const handleKeywordsChange = (newKeywords: MonitorKeyword[]) => {
    setKeywords(newKeywords);
  };

  // 刷新未读计数
  const refreshUnreadCount = useCallback(() => {
    setUnreadCount(getUnreadNotificationCount());
  }, []);

  // 同步未读计数
  useEffect(() => {
    setUnreadCount(getUnreadNotificationCount());
  }, [trends]);

  // 初始化加载
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      fetchTrends();
    }
  }, [fetchTrends]);

  // 数据更新后获取摘要
  useEffect(() => {
    if (trends.length > 0 && !aiSummary) {
      fetchSummary(trends);
    }
  }, [trends, aiSummary, fetchSummary]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (monitorTimerRef.current) {
        clearInterval(monitorTimerRef.current);
      }
    };
  }, []);

  return {
    trends,
    isLoading,
    aiSummary,
    monitorEnabled,
    lastCheckAt,
    sourceFilter,
    keywords,
    fetchTrends,
    fetchSummary,
    toggleMonitor,
    setSourceFilter,
    handleKeywordsChange,
    handleDetectFake,
    isDetecting,
    totalTrends,
    keywordMatchCount,
    fakeWarningCount,
    sourceCoverage,
    unreadCount,
    refreshUnreadCount,
    notificationVersion,
    // 排序
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    // 筛选
    scoreRange,
    setScoreRange,
    showFake,
    setShowFake,
    matchFilter,
    setMatchFilter,
    timeRange,
    setTimeRange,
    // 计算结果
    displayedTrends,
    // 关键词过滤
    keywordFilter,
    setKeywordFilter,
    matchedKeywordList,
  };
}
