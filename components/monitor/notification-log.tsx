'use client';

import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getNotificationLogs, markNotificationRead, markAllNotificationsRead } from '@/lib/store';
import type { NotificationLog } from '@/types';

interface NotificationLogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notificationVersion?: number;
  onUnreadCountChange?: () => void;
}

export function NotificationLogDialog({ open, onOpenChange, notificationVersion = 0, onUnreadCountChange }: NotificationLogDialogProps) {
  const [logs, setLogs] = useState<NotificationLog[]>([]);

  // 当弹窗打开或 notificationVersion 变化时重新读取日志
  useEffect(() => {
    if (open) {
      setLogs(getNotificationLogs());
      if (onUnreadCountChange) {
        onUnreadCountChange();
      }
    }
  }, [open, notificationVersion, onUnreadCountChange]);

  const unreadCount = useMemo(() => logs.filter(l => !l.readAt).length, [logs]);
  const hasUnread = unreadCount > 0;

  const handleMarkRead = (id: string) => {
    markNotificationRead(id);
    setLogs(getNotificationLogs());
    if (onUnreadCountChange) {
      onUnreadCountChange();
    }
  };

  const handleMarkAllRead = () => {
    markAllNotificationsRead();
    setLogs(getNotificationLogs());
    if (onUnreadCountChange) {
      onUnreadCountChange();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-card border-border flex flex-col max-h-[80vh]">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-base flex items-center gap-2">
            🔔 通知记录
          </DialogTitle>
        </DialogHeader>

        {logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            暂无通知记录
          </div>
        ) : (
          <div className="min-w-0 flex flex-col min-h-0 flex-1">
            {/* 顶部操作栏 */}
            <div className="flex items-center justify-between mb-3 flex-shrink-0">
              <span className="text-sm text-muted-foreground">
                {hasUnread ? `${unreadCount} 条未读` : '全部已读'}
              </span>
              {hasUnread && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-sm text-primary hover:text-primary/80 transition-colors font-medium flex-shrink-0"
                >
                  全部已读
                </button>
              )}
            </div>

            <div className="overflow-y-auto flex-1 min-h-0 -mr-2 pr-2">
              <div className="space-y-2 min-w-0">
                {logs.map(log => {
                  const isUnread = !log.readAt;
                  return (
                    <div
                      key={log.id}
                      onClick={() => isUnread && handleMarkRead(log.id)}
                      className={`text-sm p-3 rounded-md transition-all min-w-0 ${
                        isUnread
                          ? log.isFake
                            ? 'bg-destructive/15 border border-destructive/30 cursor-pointer hover:bg-destructive/20'
                            : 'bg-primary/15 border border-primary/30 cursor-pointer hover:bg-primary/20'
                          : log.isFake
                            ? 'bg-destructive/5 border border-destructive/10 opacity-60'
                            : 'bg-primary/5 border border-primary/10 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {isUnread && (
                          <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                        )}
                        <span className="flex-shrink-0">{log.isFake ? '⚠️' : '🎯'}</span>
                        <a
                          href={log.trendUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="font-medium hover:text-primary truncate min-w-0"
                        >
                          {log.trendTitle}
                        </a>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 truncate">
                        关键词: {log.keyword} · {new Date(log.notifiedAt).toLocaleString('zh-CN')}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
