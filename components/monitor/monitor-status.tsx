'use client';

import { ShimmerButton } from '@/components/ui/shimmer-button';
import { Badge } from '@/components/ui/badge';

interface MonitorStatusProps {
  enabled: boolean;
  interval: number;
  lastCheckAt?: string;
  onToggle: () => void;
}

export function MonitorStatus({ enabled, interval, lastCheckAt, onToggle }: MonitorStatusProps) {
  const intervalMin = Math.round(interval / 60000);

  return (
    <div className="flex items-center gap-3">
      <ShimmerButton
        onClick={onToggle}
        className={`h-9 px-4 text-sm font-medium ${
          enabled
            ? 'bg-primary shimmer:primary-foreground'
            : 'bg-muted text-muted-foreground'
        }`}
      >
        {enabled ? '⏸ 暂停监控' : '▶ 开启监控'}
      </ShimmerButton>

      {enabled && (
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs border-primary/30 text-primary">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-pulse mr-1" />
            监控中
          </Badge>
          <span className="text-xs text-muted-foreground">
            每{intervalMin}分钟检查
          </span>
        </div>
      )}

      {lastCheckAt && (
        <span className="text-xs text-muted-foreground">
          上次检查: {formatTimeAgo(lastCheckAt)}
        </span>
      )}
    </div>
  );
}

function formatTimeAgo(dateStr: string): string {
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return '刚刚';
    if (min < 60) return `${min}分钟前`;
    return `${Math.floor(min / 60)}小时前`;
  } catch {
    return '';
  }
}
