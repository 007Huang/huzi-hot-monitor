'use client';

import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { SummarizeResult } from '@/types';

interface AiInsightsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  aiSummary: SummarizeResult | null;
  onFetchSummary: () => void;
  isLoading: boolean;
}

export function AiInsightsDialog({ open, onOpenChange, aiSummary, onFetchSummary, isLoading }: AiInsightsDialogProps) {
  const [expanded, setExpanded] = useState(false);

  const summaryText = aiSummary?.summary || '';
  const summaryTruncated = useMemo(() => {
    if (!summaryText) return '';
    const lines = summaryText.split('\n');
    if (lines.length > 5 && !expanded) {
      return lines.slice(0, 5).join('\n') + '...';
    }
    return summaryText;
  }, [summaryText, expanded]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            🤖 AI 洞察
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {aiSummary ? 'AI 分析结果' : '点击生成获取 AI 分析'}
            </span>
            <Button
              onClick={onFetchSummary}
              disabled={isLoading}
              variant="outline"
              size="sm"
              className="h-8 text-sm px-3"
            >
              {isLoading ? '⏳ 分析中...' : '🔄 生成'}
            </Button>
          </div>

          {aiSummary ? (
            <div className="space-y-3">
              <div
                className="text-sm leading-relaxed text-foreground/80 whitespace-pre-line cursor-pointer rounded-lg bg-muted/30 p-3 border border-border/50 hover:border-border transition-colors"
                onClick={() => setExpanded(!expanded)}
              >
                {summaryTruncated}
                {summaryText.split('\n').length > 5 && (
                  <span className="text-primary text-sm ml-1 font-medium">
                    {expanded ? '收起' : '展开'}
                  </span>
                )}
              </div>

              {aiSummary.topTopics.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {aiSummary.topTopics.map(topic => (
                    <span
                      key={topic}
                      className="text-sm px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <div className="text-2xl mb-2">🤖</div>
              <p className="text-sm">
                {isLoading ? 'AI 正在分析热点趋势...' : '点击"生成"获取 AI 分析'}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
