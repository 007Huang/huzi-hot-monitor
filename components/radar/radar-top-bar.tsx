'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MonitorStatus } from '@/components/monitor/monitor-status';
import { AiInsightsDialog } from '@/components/dashboard/ai-insights';
import { NotificationLogDialog } from '@/components/monitor/notification-log';
import type { SummarizeResult } from '@/types';

interface RadarTopBarProps {
  isLoading: boolean;
  monitorEnabled: boolean;
  lastCheckAt: string | undefined;
  onRefresh: () => void;
  onToggleMonitor: () => void;
  aiSummary: SummarizeResult | null;
  onFetchSummary: () => void;
  notificationVersion: number;
  onRefreshUnreadCount: () => void;
  unreadCount: number;
}

export function RadarTopBar({
  isLoading,
  monitorEnabled,
  lastCheckAt,
  onRefresh,
  onToggleMonitor,
  aiSummary,
  onFetchSummary,
  notificationVersion,
  onRefreshUnreadCount,
  unreadCount,
}: RadarTopBarProps) {
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [notifyDialogOpen, setNotifyDialogOpen] = useState(false);

  return (
    <>
      <header className="radar-topbar">
        <div className="radar-topbar-left">
          <h1 className="radar-topbar-title">🔥 热点雷达</h1>
        </div>

        <div className="radar-topbar-right">
          {/* AI 洞察按钮 */}
          <button
            className={`radar-toolbar-btn ${aiDialogOpen ? 'radar-toolbar-btn-active' : ''}`}
            onClick={() => setAiDialogOpen(true)}
            title="AI 洞察"
          >
            🤖
          </button>

          {/* 通知按钮 */}
          <button
            className={`radar-toolbar-btn ${notifyDialogOpen ? 'radar-toolbar-btn-active' : ''}`}
            onClick={() => setNotifyDialogOpen(true)}
            title="通知记录"
          >
            🔔
            {unreadCount > 0 && (
              <Badge variant="destructive" className="radar-toolbar-badge">
                {unreadCount}
              </Badge>
            )}
          </button>

          <Button
            onClick={onRefresh}
            disabled={isLoading}
            variant="ghost"
            size="sm"
            className="h-8 text-sm px-2 text-muted-foreground hover:text-foreground"
          >
            {isLoading ? '⏳ 刷新中...' : '🔄 刷新'}
          </Button>

          <MonitorStatus
            enabled={monitorEnabled}
            interval={5 * 60 * 1000}
            lastCheckAt={lastCheckAt}
            onToggle={onToggleMonitor}
          />
        </div>
      </header>

      {/* AI 洞察弹窗 */}
      <AiInsightsDialog
        open={aiDialogOpen}
        onOpenChange={setAiDialogOpen}
        aiSummary={aiSummary}
        onFetchSummary={onFetchSummary}
        isLoading={isLoading}
      />

      {/* 通知记录弹窗 */}
      <NotificationLogDialog
        open={notifyDialogOpen}
        onOpenChange={setNotifyDialogOpen}
        notificationVersion={notificationVersion}
        onUnreadCountChange={onRefreshUnreadCount}
      />
    </>
  );
}
