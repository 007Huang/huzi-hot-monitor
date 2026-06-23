'use client';

import { Button } from '@/components/ui/button';
import { MonitorStatus } from '@/components/monitor/monitor-status';

interface TitleBarProps {
  isLoading: boolean;
  monitorEnabled: boolean;
  lastCheckAt: string | undefined;
  onRefresh: () => void;
  onToggleMonitor: () => void;
  onMobileMenuToggle: () => void;
}

export function TitleBar({
  isLoading,
  monitorEnabled,
  lastCheckAt,
  onRefresh,
  onToggleMonitor,
  onMobileMenuToggle,
}: TitleBarProps) {
  return (
    <header className="flex items-center justify-between px-4 h-11 border-b border-border/20 bg-background flex-shrink-0 select-none">
      <div className="flex items-center gap-3">
        {/* macOS 风格圆点 */}
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500/80" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
          <div className="w-3 h-3 rounded-full bg-green-500/80" />
        </div>

        {/* 移动端 hamburger */}
        <Button
          variant="ghost"
          size="icon-sm"
          className="md:hidden h-7 w-7 -ml-1"
          onClick={onMobileMenuToggle}
        >
          <span className="text-base">☰</span>
        </Button>

        <div className="flex items-center gap-1.5 ml-1">
          <span className="text-sm">🔥</span>
          <h1 className="text-xs font-semibold text-foreground tracking-tight">
            Hot Monitor
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          onClick={onRefresh}
          disabled={isLoading}
          variant="ghost"
          size="sm"
          className="h-6 text-[11px] px-2 text-muted-foreground hover:text-foreground"
        >
          {isLoading ? '⏳' : '🔄'}
        </Button>

        <MonitorStatus
          enabled={monitorEnabled}
          interval={5 * 60 * 1000}
          lastCheckAt={lastCheckAt}
          onToggle={onToggleMonitor}
        />
      </div>
    </header>
  );
}
