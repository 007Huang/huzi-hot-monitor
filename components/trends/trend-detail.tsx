'use client';

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

export function TrendDetail({ trend, open, onOpenChange, onDetectFake, isDetecting }: TrendDetailProps) {
  if (!trend) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-lg leading-snug pr-8">
            {trend.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
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
            {trend.isFake !== undefined && (
              <Badge variant={trend.isFake ? 'destructive' : 'default'} className="text-sm">
                {trend.isFake ? '⚠️ 疑似虚假' : '✅ 内容可信'}
              </Badge>
            )}
          </div>

          {/* 描述 */}
          {trend.description && (
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">内容摘要</h4>
              <p className="text-base text-foreground/80 leading-relaxed">{trend.description}</p>
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
          <div className="flex gap-2">
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
