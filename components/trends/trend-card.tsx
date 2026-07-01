'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BorderBeam } from '@/components/ui/border-beam';
import { NumberTicker } from '@/components/ui/number-ticker';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { TrendItem } from '@/types';

interface TrendCardProps {
  trend: TrendItem;
  rank: number;
  onClick?: (trend: TrendItem) => void;
  showMatchReason?: boolean;
}

const sourceColors: Record<string, string> = {
  'web-search': 'bg-accent/20 text-accent border-accent/30',
  'twitter': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'weibo': 'bg-red-500/20 text-red-400 border-red-500/30',
  'zhihu': 'bg-blue-600/20 text-blue-500 border-blue-600/30',
  'tech-news': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'toutiao': 'bg-orange-500/20 text-orange-400 border-orange-500/30',
};

function formatNumber(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function formatFullTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const h = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${d} ${h}:${min}`;
  } catch {
    return dateStr;
  }
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

export function TrendCard({ trend, rank, onClick, showMatchReason }: TrendCardProps) {
  const isTop = rank <= 3;
  const isFake = trend.isFake;
  const [localExpandReason, setLocalExpandReason] = useState(false);
  const [localExpandLocalReason, setLocalExpandLocalReason] = useState(false);

  // 修复 ?? bug：全局控制为 true 时展开，否则使用本地状态
  // 当全局从 ON 切换到 OFF 时，重置本地展开状态
  const prevShowMatchReason = useRef(showMatchReason);
  useEffect(() => {
    if (prevShowMatchReason.current === true && showMatchReason !== true) {
      setLocalExpandReason(false);
      setLocalExpandLocalReason(false);
    }
    prevShowMatchReason.current = showMatchReason;
  }, [showMatchReason]);

  const reasonExpanded = showMatchReason === true ? true : localExpandReason;
  const localReasonExpanded = showMatchReason === true ? true : localExpandLocalReason;

  // 时间 tooltip：区分发布时间和抓取时间
  const createdDate = new Date(trend.createdAt);
  const fetchedDate = new Date(trend.fetchedAt);
  const timeDiffMs = Math.abs(createdDate.getTime() - fetchedDate.getTime());
  const isFetchedOnly = timeDiffMs < 60000;
  const timeLabel = isFetchedOnly ? '抓取于' : '发布于';
  const timeDateStr = isFetchedOnly ? trend.fetchedAt : trend.createdAt;

  // 趋势箭头
  const trendArrow = (() => {
    if (!trend.direction || trend.direction === 'stable') return null;
    if (trend.direction === 'new') {
      return (
        <span className="text-[10px] text-primary font-semibold ml-1 px-1 rounded bg-primary/10">
          NEW
        </span>
      );
    }
    const diff = trend.score - (trend.previousScore ?? trend.score);
    const isUp = trend.direction === 'up';
    return (
      <span className={`text-[10px] font-semibold ml-1 ${isUp ? 'text-green-400' : 'text-red-400'}`}>
        {isUp ? '↑' : '↓'}{Math.abs(diff)}
      </span>
    );
  })();

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
            <span className={`text-xl font-black ${
              rank === 1 ? 'text-primary' : rank === 2 ? 'text-amber-400' : rank === 3 ? 'text-orange-400' : 'text-muted-foreground'
            }`}>
              #{rank}
            </span>
            <Badge
              variant="outline"
              className={`text-xs px-2 py-0.5 ${sourceColors[trend.source] || ''}`}
            >
              {trend.sourceLabel}
            </Badge>
            {/* 真实性标记：双态 */}
            {isFake === true && (
              <Badge variant="destructive" className="text-xs px-2 py-0.5">
                🔴 可疑
              </Badge>
            )}
            {isFake === false && (
              <Badge className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 border-green-500/30">
                🟢 可信
              </Badge>
            )}
            {trend.matchedKeywords && trend.matchedKeywords.length > 0 && (
              <Badge className="text-xs px-2 py-0.5 bg-primary/20 text-primary border-primary/30">
                🎯 {trend.matchedKeywords.join(', ')}
              </Badge>
            )}
          </div>
          <div className="text-right flex flex-col items-end">
            <div className="text-xs text-muted-foreground">热度</div>
            <div className="flex items-center">
              <NumberTicker value={trend.score} className="text-base font-bold text-primary" />
              {trendArrow}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <h3 className="text-base font-semibold leading-snug line-clamp-2 group-hover:text-primary transition-colors">
          {trend.title}
        </h3>

        {/* AI 摘要（卡片上代替原始描述） */}
        {trend.aiSummary && (
          <div className="mt-1.5">
            <p className="text-sm text-muted-foreground leading-relaxed">
              <span className="text-[10px] px-1 rounded bg-primary/15 text-primary/70 font-medium mr-1">【AI摘要】</span>
              {trend.aiSummary}
            </p>
          </div>
        )}
        {!trend.aiSummary && trend.description && (
          <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">
            {trend.description}
          </p>
        )}

        {/* 时间 + 作者行 */}
        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          {trend.author && (
            <>
              <span>@{trend.author}</span>
              <span>·</span>
            </>
          )}
          <Tooltip>
            <TooltipTrigger
              render={
                <span className="cursor-help border-b border-dotted border-muted-foreground/50">
                  {`${timeLabel === '抓取于' ? '🕐' : '📅'} ${formatTimeAgo(trend.createdAt)}`}
                </span>
              }
            />
            <TooltipContent side="top" className="text-xs">
              {timeLabel} {formatFullTime(timeDateStr)}
            </TooltipContent>
          </Tooltip>
        </div>

        {/* 互动数据行 */}
        {trend.interactions && (
          <div className="mt-1.5 flex items-center gap-3 text-[10px] text-muted-foreground/80">
            {trend.interactions.likes !== undefined && trend.interactions.likes > 0 && (
              <span>👍 {formatNumber(trend.interactions.likes)}</span>
            )}
            {trend.interactions.retweets !== undefined && trend.interactions.retweets > 0 && (
              <span>🔄 {formatNumber(trend.interactions.retweets)}</span>
            )}
            {trend.interactions.replies !== undefined && trend.interactions.replies > 0 && (
              <span>💬 {formatNumber(trend.interactions.replies)}</span>
            )}
            {trend.interactions.views !== undefined && trend.interactions.views > 0 && (
              <span>👁 {formatNumber(trend.interactions.views)}</span>
            )}
          </div>
        )}

        {/* 标签 */}
        {trend.tags && trend.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {trend.tags.slice(0, 3).map(tag => (
              <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* AI 匹配理由折叠区域 */}
        {trend.matchReason && (
          <div className="mt-2" onClick={e => e.stopPropagation()}>
            {reasonExpanded ? (
              <div className="border-l-2 border-primary/40 pl-2 py-1">
                <button
                  onClick={() => setLocalExpandReason(false)}
                  className="text-xs text-primary/70 hover:text-primary transition-colors mb-1"
                >
                  🤖 AI 相关性分析 ▴
                </button>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {trend.matchReason}
                </p>
                {trend.matchRelationType && (
                  <span className={`inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded-full ${
                    trend.matchRelationType === 'explicit'
                      ? 'bg-green-500/15 text-green-400'
                      : 'bg-blue-500/15 text-blue-400'
                  }`}>
                    {trend.matchRelationType === 'explicit' ? '显式匹配' : '语义匹配'}
                  </span>
                )}
              </div>
            ) : (
              <button
                onClick={() => setLocalExpandReason(true)}
                className="text-xs text-primary/60 hover:text-primary transition-colors"
              >
                🤖 AI 相关性分析 ▾
              </button>
            )}
          </div>
        )}

        {/* 本地关键词匹配理由折叠区域 */}
        {trend.localMatchReason && !trend.matchReason && (
          <div className="mt-2" onClick={e => e.stopPropagation()}>
            {localReasonExpanded ? (
              <div className="border-l-2 border-amber-400/40 pl-2 py-1">
                <button
                  onClick={() => setLocalExpandLocalReason(false)}
                  className="text-xs text-amber-500/80 hover:text-amber-500 transition-colors mb-1"
                >
                  🎯 关键词匹配 ▴
                </button>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {trend.localMatchReason}
                </p>
              </div>
            ) : (
              <button
                onClick={() => setLocalExpandLocalReason(true)}
                className="text-xs text-amber-500/70 hover:text-amber-500 transition-colors"
              >
                🎯 关键词匹配 ▾
              </button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
