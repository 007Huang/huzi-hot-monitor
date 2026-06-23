'use client';

import { Marquee } from '@/components/ui/marquee';
import type { TrendItem } from '@/types';

interface MarqueeHeaderProps {
  trends: TrendItem[];
  isLoading?: boolean;
}

export function MarqueeHeader({ trends, isLoading }: MarqueeHeaderProps) {
  if (isLoading) {
    return (
      <div className="w-full h-8 bg-muted/20 border-t border-border/30 flex items-center px-4 flex-shrink-0">
        <span className="text-[11px] text-muted-foreground animate-pulse">正在获取最新热点...</span>
      </div>
    );
  }

  if (trends.length === 0) {
    return (
      <div className="w-full h-8 bg-muted/20 border-t border-border/30 flex items-center px-4 flex-shrink-0">
        <span className="text-[11px] text-muted-foreground">暂无热点数据，请添加监控关键词或点击刷新</span>
      </div>
    );
  }

  const items = trends.slice(0, 20);

  return (
    <div className="w-full h-8 bg-muted/20 border-t border-border/30 flex items-center overflow-hidden flex-shrink-0">
      <div className="flex items-center gap-2 px-3 h-full bg-muted/30 border-r border-border/30 flex-shrink-0">
        <span className="text-[10px] font-semibold text-primary">📡 热点滚动</span>
      </div>
      <Marquee pauseOnHover className="[--duration:50s]">
        {items.map((trend, idx) => (
          <a
            key={trend.id}
            href={trend.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 text-[11px] hover:text-primary transition-colors"
          >
            <span className="text-primary font-bold text-[10px]">#{idx + 1}</span>
            <span className="text-foreground/70 truncate max-w-[200px]">{trend.title}</span>
            <span className="text-accent text-[9px]">({trend.sourceLabel})</span>
          </a>
        ))}
      </Marquee>
    </div>
  );
}
