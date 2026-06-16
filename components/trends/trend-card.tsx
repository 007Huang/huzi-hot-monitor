'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BorderBeam } from '@/components/ui/border-beam';
import { NumberTicker } from '@/components/ui/number-ticker';
import type { TrendItem } from '@/types';

interface TrendCardProps {
  trend: TrendItem;
  rank: number;
  onClick?: (trend: TrendItem) => void;
}

const sourceColors: Record<string, string> = {
  'web-search': 'bg-accent/20 text-accent border-accent/30',
  'twitter': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
};

export function TrendCard({ trend, rank, onClick }: TrendCardProps) {
  const isTop = rank <= 3;
  const isFake = trend.isFake;

  return (
    <Card
      className={`group relative overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-primary/5 ${
        isFake ? 'opacity-60 ring-1 ring-destructive/50' : ''
      } ${isTop ? 'ring-1 ring-primary/30' : ''}`}
      onClick={() => onClick?.(trend)}
    >
      {isTop && <BorderBeam size={80} duration={6} delay={rank * 2} />}

      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className={`text-lg font-black ${
              rank === 1 ? 'text-primary' : rank === 2 ? 'text-amber-400' : rank === 3 ? 'text-orange-400' : 'text-muted-foreground'
            }`}>
              #{rank}
            </span>
            <Badge
              variant="outline"
              className={`text-[10px] px-1.5 py-0 ${sourceColors[trend.source] || ''}`}
            >
              {trend.sourceLabel}
            </Badge>
            {isFake && (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                ⚠️ 疑似虚假
              </Badge>
            )}
            {trend.matchedKeywords && trend.matchedKeywords.length > 0 && (
              <Badge className="text-[10px] px-1.5 py-0 bg-primary/20 text-primary border-primary/30">
                🎯 {trend.matchedKeywords.join(', ')}
              </Badge>
            )}
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">热度</div>
            <NumberTicker value={trend.score} className="text-sm font-bold text-primary" />
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <h3 className="text-sm font-semibold leading-snug line-clamp-2 group-hover:text-primary transition-colors">
          {trend.title}
        </h3>
        {trend.description && (
          <p className="mt-1.5 text-xs text-muted-foreground line-clamp-2">
            {trend.description}
          </p>
        )}
        <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground">
          {trend.author && (
            <>
              <span>@{trend.author}</span>
              <span>·</span>
            </>
          )}
          <span>{formatTimeAgo(trend.createdAt)}</span>
        </div>
        {trend.tags && trend.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {trend.tags.slice(0, 3).map(tag => (
              <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                {tag}
              </span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function formatTimeAgo(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHour = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return '刚刚';
    if (diffMin < 60) return `${diffMin}分钟前`;
    if (diffHour < 24) return `${diffHour}小时前`;
    return `${diffDay}天前`;
  } catch {
    return '';
  }
}
