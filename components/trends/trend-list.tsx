'use client';

import { ScrollArea } from '@/components/ui/scroll-area';
import { AnimatedList } from '@/components/ui/animated-list';
import { TrendCard } from './trend-card';
import type { TrendItem } from '@/types';

interface TrendListProps {
  trends: TrendItem[];
  isLoading?: boolean;
  onTrendClick?: (trend: TrendItem) => void;
}

export function TrendList({ trends, isLoading, onTrendClick }: TrendListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-[120px] rounded-lg bg-muted/50 animate-pulse" />
        ))}
      </div>
    );
  }

  if (trends.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <div className="text-4xl mb-2">🔍</div>
        <p className="text-sm">暂无热点数据</p>
        <p className="text-xs mt-1">点击刷新按钮或添加监控关键词</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[600px]">
      <AnimatedList>
        {trends.map((trend, idx) => (
          <TrendCard
            key={trend.id}
            trend={trend}
            rank={idx + 1}
            onClick={onTrendClick}
          />
        ))}
      </AnimatedList>
    </ScrollArea>
  );
}
