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
      <div className="w-full bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border-y border-border/50 py-2">
        <div className="text-sm text-muted-foreground text-center animate-pulse">
          正在获取最新热点...
        </div>
      </div>
    );
  }

  if (trends.length === 0) {
    return (
      <div className="w-full bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border-y border-border/50 py-2">
        <div className="text-sm text-muted-foreground text-center">
          暂无热点数据，请添加监控关键词或点击刷新
        </div>
      </div>
    );
  }

  const items = trends.slice(0, 15);

  return (
    <div className="w-full bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border-y border-border/50 py-2 overflow-hidden">
      <Marquee pauseOnHover className="[--duration:40s]">
        {items.map((trend, idx) => (
          <a
            key={trend.id}
            href={trend.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 text-sm hover:text-primary transition-colors"
          >
            <span className="text-primary font-bold">#{idx + 1}</span>
            <span className="text-foreground/80">{trend.title.slice(0, 50)}</span>
            <span className="text-accent text-xs">({trend.sourceLabel})</span>
            <span className="text-muted-foreground">•</span>
          </a>
        ))}
      </Marquee>
    </div>
  );
}
