'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { TrendItem } from '@/types';

interface TrendDetailProps {
  trend: TrendItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDetectFake?: (trend: TrendItem) => void;
  isDetecting?: boolean;
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

function formatNumber(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export function TrendDetail({ trend, open, onOpenChange, onDetectFake, isDetecting }: TrendDetailProps) {
  const [descExpanded, setDescExpanded] = useState(false);

  if (!trend) return null;

  // 判断是否有原始发布时间
  const createdDate = new Date(trend.createdAt);
  const fetchedDate = new Date(trend.fetchedAt);
  const timeDiffMs = Math.abs(createdDate.getTime() - fetchedDate.getTime());
  const hasOriginalTime = timeDiffMs >= 60000;

  // 判断描述是否需要折叠（超过 200 字符或 3 行）
  const descLong = (trend.description?.length ?? 0) > 200;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl bg-card border-border flex flex-col max-h-[80vh]">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-lg leading-snug pr-8">
            {trend.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto flex-1 min-h-0 pr-1 -mr-1">
          {/* 元信息 */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="text-sm">
              📡 {trend.sourceLabel}
            </Badge>
            <Badge variant="outline" className="text-sm">
              🔥 热度 {trend.score}
            </Badge>
            {trend.author && (
              <Badge variant="outline" className="text-sm">
                👤 @{trend.author}
              </Badge>
            )}
            {trend.isFake === true && (
              <Badge variant="destructive" className="text-sm">
                🔴 可疑
              </Badge>
            )}
            {trend.isFake === false && (
              <Badge className="text-sm bg-green-500/20 text-green-400 border-green-500/30">
                🟢 可信
              </Badge>
            )}
            {trend.direction && trend.direction !== 'stable' && (
              <Badge variant="outline" className={`text-sm ${
                trend.direction === 'up' ? 'text-green-400 border-green-500/30' :
                trend.direction === 'down' ? 'text-red-400 border-red-500/30' :
                'text-primary border-primary/30'
              }`}>
                {trend.direction === 'up' ? '📈 上升' :
                 trend.direction === 'down' ? '📉 下降' :
                 '🆕 新增'}
                {trend.previousScore !== undefined && trend.previousScore !== trend.score &&
                  ` (${trend.score > trend.previousScore ? '+' : ''}${trend.score - trend.previousScore})`}
              </Badge>
            )}
          </div>

          {/* 发布时间 + 抓取时间 */}
          <div className="space-y-1.5 p-3 rounded-lg bg-muted/30 border border-border/50">
            {hasOriginalTime ? (
              <>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground flex-shrink-0">📅 发布时间：</span>
                  <span className="text-foreground">{formatFullTime(trend.createdAt)}</span>
                  <span className="text-xs text-muted-foreground">({formatTimeAgo(trend.createdAt)})</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground flex-shrink-0">🕐 抓取时间：</span>
                  <span className="text-foreground">{formatFullTime(trend.fetchedAt)}</span>
                  <span className="text-xs text-muted-foreground">({formatTimeAgo(trend.fetchedAt)})</span>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground flex-shrink-0">🕐 抓取时间：</span>
                <span className="text-foreground">{formatFullTime(trend.fetchedAt)}</span>
                <span className="text-xs text-muted-foreground">({formatTimeAgo(trend.fetchedAt)})</span>
              </div>
            )}
          </div>

          {/* 互动数据 */}
          {trend.interactions && (
            <div className="grid grid-cols-2 gap-2">
              {trend.interactions.likes !== undefined && trend.interactions.likes > 0 && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border/50">
                  <span className="text-lg">👍</span>
                  <div>
                    <div className="text-sm font-semibold">{formatNumber(trend.interactions.likes)}</div>
                    <div className="text-[10px] text-muted-foreground">点赞</div>
                  </div>
                </div>
              )}
              {trend.interactions.retweets !== undefined && trend.interactions.retweets > 0 && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border/50">
                  <span className="text-lg">🔄</span>
                  <div>
                    <div className="text-sm font-semibold">{formatNumber(trend.interactions.retweets)}</div>
                    <div className="text-[10px] text-muted-foreground">转发</div>
                  </div>
                </div>
              )}
              {trend.interactions.replies !== undefined && trend.interactions.replies > 0 && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border/50">
                  <span className="text-lg">💬</span>
                  <div>
                    <div className="text-sm font-semibold">{formatNumber(trend.interactions.replies)}</div>
                    <div className="text-[10px] text-muted-foreground">评论</div>
                  </div>
                </div>
              )}
              {trend.interactions.views !== undefined && trend.interactions.views > 0 && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border/50">
                  <span className="text-lg">👁</span>
                  <div>
                    <div className="text-sm font-semibold">{formatNumber(trend.interactions.views)}</div>
                    <div className="text-[10px] text-muted-foreground">浏览</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 原始内容（可折叠） */}
          {trend.description && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">原始内容</h4>
              <div className={`relative ${descLong && !descExpanded ? 'max-h-[4.5em] overflow-hidden' : ''}`}>
                <p className="text-base text-foreground/80 leading-relaxed whitespace-pre-line break-words">
                  {trend.description}
                </p>
                {descLong && !descExpanded && (
                  <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-card to-transparent pointer-events-none" />
                )}
              </div>
              {descLong && (
                <button
                  onClick={() => setDescExpanded(!descExpanded)}
                  className="mt-1 text-xs text-primary hover:text-primary/80 transition-colors"
                >
                  {descExpanded ? '▲ 收起' : '▼ 展开全文'}
                </button>
              )}
            </div>
          )}

          {/* AI 摘要 */}
          {trend.aiSummary && (
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
              <h4 className="text-sm font-medium text-primary/80 mb-1">🤖 AI 摘要</h4>
              <p className="text-sm text-foreground/80 leading-relaxed">{trend.aiSummary}</p>
            </div>
          )}

          {/* AI 匹配理由 */}
          {trend.matchReason && (
            <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
              <h4 className="text-sm font-medium text-primary/80 mb-1">🤖 AI 匹配相关性分析</h4>
              <p className="text-sm text-foreground/80 leading-relaxed">{trend.matchReason}</p>
              {trend.matchRelationType && (
                <div className="mt-2 flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${
                    trend.matchRelationType === 'explicit'
                      ? 'bg-green-500/15 text-green-400 border-green-500/30'
                      : 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                  }`}>
                    {trend.matchRelationType === 'explicit' ? '显式匹配' : '语义匹配'}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* 本地关键词匹配理由 */}
          {trend.localMatchReason && !trend.matchReason && (
            <div className="p-4 rounded-lg bg-amber-500/5 border border-amber-500/20">
              <h4 className="text-sm font-medium text-amber-600/80 mb-1">🎯 关键词匹配</h4>
              <p className="text-sm text-foreground/80 leading-relaxed">{trend.localMatchReason}</p>
            </div>
          )}

          {/* AI 假内容检测原因 */}
          {trend.fakeReason && (
            <div className="p-4 rounded-lg bg-muted/50 border border-border">
              <h4 className="text-sm font-medium text-muted-foreground mb-1">AI 检测结果</h4>
              <p className="text-base">{trend.fakeReason}</p>
            </div>
          )}

          {/* 标签 */}
          {trend.tags && trend.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {trend.tags.map(tag => (
                <span key={tag} className="text-sm px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex gap-2 sticky bottom-0 bg-card py-2 -mx-1 px-1 border-t border-border/30">
            <Button
              size="default"
              className="flex-1"
              onClick={() => window.open(trend.url, '_blank', 'noopener,noreferrer')}
            >
              🔗 查看原文
            </Button>
            {onDetectFake && trend.isFake === undefined && (
              <Button
                variant="outline"
                size="default"
                onClick={() => onDetectFake(trend)}
                disabled={isDetecting}
              >
                {isDetecting ? '🔍 检测中...' : '🛡️ AI验真'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
