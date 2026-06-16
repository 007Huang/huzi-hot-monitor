'use client';

import { ScrollArea } from '@/components/ui/scroll-area';
import { getNotificationLogs } from '@/lib/store';
import type { NotificationLog } from '@/types';

export function NotificationLogList() {
  const logs = getNotificationLogs();

  if (logs.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground text-xs">
        暂无通知记录
      </div>
    );
  }

  return (
    <ScrollArea className="max-h-[200px]">
      <div className="space-y-1.5">
        {logs.map(log => (
          <div
            key={log.id}
            className={`text-xs p-2 rounded-md ${
              log.isFake ? 'bg-destructive/10 border border-destructive/20' : 'bg-primary/10 border border-primary/20'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <span>{log.isFake ? '⚠️' : '🎯'}</span>
              <a
                href={log.trendUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium hover:text-primary truncate"
              >
                {log.trendTitle}
              </a>
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              关键词: {log.keyword} · {new Date(log.notifiedAt).toLocaleString('zh-CN')}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
