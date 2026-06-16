'use client';

// 监控调度 Hook - 客户端轮询 + 变化检测 + 关键词匹配 + 通知

import { useState, useCallback, useEffect, useRef } from 'react';
import type { TrendItem, MonitorKeyword, SummarizeResult } from '@/types';
import {
  addNotifiedId,
  addNotificationLog,
  getNotifiedIds,
  getKeywords,
  getMonitorConfig,
  saveMonitorConfig,
} from '@/lib/store';

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
}

export function useMonitor(): UseMonitorReturn {
  const [trends, setTrends] = useState<TrendItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sourceFilter, setSourceFilter] = useState('all');
  const [monitorEnabled, setMonitorEnabled] = useState(false);
  const [lastCheckAt, setLastCheckAt] = useState<string>();
  const [aiSummary, setAiSummary] = useState<SummarizeResult | null>(null);
  const [keywords, setKeywords] = useState<MonitorKeyword[]>(() => getKeywords());
  const [isDetecting, setIsDetecting] = useState(false);
  const monitorTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialMount = useRef(true);

  // 获取热点数据
  const fetchTrends = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (sourceFilter !== 'all') params.set('sources', sourceFilter);
      params.set('limit', '30');

      const activeKeywords = keywords.filter(k => k.active);
      if (activeKeywords.length > 0) {
        params.set('q', activeKeywords.map(k => k.keyword).join(' OR '));
      }

      const res = await fetch(`/api/trends?${params.toString()}`);
      const data = await res.json();

      if (data.success && data.data) {
        setTrends(data.data);
        setLastCheckAt(data.meta?.fetchedAt || new Date().toISOString());

        // 如果监控开启，进行关键词匹配和通知
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
    const keywordStrings = activeKeywords.map(k => k.keyword);

    // 批量匹配，避免逐个调用 AI
    for (const trend of trendData) {
      if (notifiedIds.has(trend.id)) continue;

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
  };
}
