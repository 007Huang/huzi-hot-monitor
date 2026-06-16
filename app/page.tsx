'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/header';
import { MarqueeHeader } from '@/components/trends/marquee-header';
import { TrendList } from '@/components/trends/trend-list';
import { TrendDetail } from '@/components/trends/trend-detail';
import { SourceTabs } from '@/components/trends/source-tabs';
import { KeywordPanel } from '@/components/monitor/keyword-panel';
import { MonitorStatus } from '@/components/monitor/monitor-status';
import { NotificationLogList } from '@/components/monitor/notification-log';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { BlurFade } from '@/components/ui/blur-fade';
import { SparklesText } from '@/components/ui/sparkles-text';
import { NumberTicker } from '@/components/ui/number-ticker';
import { useMonitor } from '@/lib/use-monitor';
import type { TrendItem } from '@/types';

export default function HomePage() {
  const {
    trends,
    isLoading,
    aiSummary,
    monitorEnabled,
    lastCheckAt,
    sourceFilter,
    keywords,
    fetchTrends,
    fetchSummary,
    toggleMonitor,
    setSourceFilter,
    handleKeywordsChange,
    handleDetectFake,
    isDetecting,
  } = useMonitor();

  const [selectedTrend, setSelectedTrend] = useState<TrendItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // 筛选后的数据
  const filteredTrends = sourceFilter === 'all'
    ? trends
    : trends.filter(t => t.source === sourceFilter);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <MarqueeHeader trends={trends} isLoading={isLoading} />

      <main className="container mx-auto px-4 md:px-6 py-6 max-w-7xl">
        {/* 顶部操作栏 */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <SourceTabs value={sourceFilter} onChange={setSourceFilter} />
          <Button
            onClick={fetchTrends}
            disabled={isLoading}
            variant="outline"
            size="sm"
            className="h-8"
          >
            {isLoading ? '⏳ 获取中...' : '🔄 刷新热点'}
          </Button>
          <MonitorStatus
            enabled={monitorEnabled}
            interval={5 * 60 * 1000}
            lastCheckAt={lastCheckAt}
            onToggle={toggleMonitor}
          />
        </div>

        {/* Bento Grid 仪表盘 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
          {/* 左侧：关键词管理 + 通知记录 */}
          <BlurFade delay={0.1} className="md:col-span-1 space-y-4">
            <Card className="border-border/50">
              <CardContent className="p-4">
                <KeywordPanel onKeywordsChange={handleKeywordsChange} />
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader className="pb-2 px-4 pt-3">
                <span className="text-xs font-medium text-muted-foreground">📋 通知记录</span>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <NotificationLogList />
              </CardContent>
            </Card>
          </BlurFade>

          {/* 中间：热点列表 */}
          <BlurFade delay={0.2} className="md:col-span-1">
            <Card className="border-border/50">
              <CardHeader className="pb-2 px-4 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold">🔥 热点排行</span>
                  <span className="text-[10px] text-muted-foreground">
                    共 <NumberTicker value={filteredTrends.length} className="text-xs font-bold text-primary" /> 条
                  </span>
                </div>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <TrendList
                  trends={filteredTrends}
                  isLoading={isLoading}
                  onTrendClick={(trend) => {
                    setSelectedTrend(trend);
                    setDetailOpen(true);
                  }}
                />
              </CardContent>
            </Card>
          </BlurFade>

          {/* 右侧：AI 摘要 */}
          <BlurFade delay={0.3} className="md:col-span-1">
            <Card className="border-border/50">
              <CardHeader className="pb-2 px-4 pt-3">
                <div className="flex items-center gap-2">
                  <SparklesText className="text-sm font-bold">AI 智能摘要</SparklesText>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                {aiSummary ? (
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-muted/50 border border-border">
                      <p className="text-sm leading-relaxed whitespace-pre-line">{aiSummary.summary}</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {aiSummary.topTopics.map(topic => (
                        <span key={topic} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                          {topic}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <div className="text-3xl mb-2">🤖</div>
                    <p className="text-xs">加载热点数据后自动生成摘要</p>
                  </div>
                )}
                <Separator className="my-3 bg-border/50" />
                <Button
                  onClick={() => fetchSummary(trends)}
                  variant="outline"
                  size="sm"
                  className="w-full h-8 text-xs"
                  disabled={trends.length === 0}
                >
                  🔄 重新生成摘要
                </Button>
              </CardContent>
            </Card>
          </BlurFade>
        </div>
      </main>

      {/* 热点详情弹窗 */}
      <TrendDetail
        trend={selectedTrend}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onDetectFake={handleDetectFake}
        isDetecting={isDetecting}
      />
    </div>
  );
}
