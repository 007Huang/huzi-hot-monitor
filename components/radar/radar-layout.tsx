'use client';

import { useState } from 'react';
import { RadarSidebar } from '@/components/radar/radar-sidebar';
import { RadarTopBar } from '@/components/radar/radar-top-bar';
import { RadarFilterTabs } from '@/components/radar/radar-filter-tabs';
import { RadarHotspotList } from '@/components/radar/radar-hotspot-list';
import { TrendDetail } from '@/components/trends/trend-detail';
import { useMonitor } from '@/lib/use-monitor';
import type { TrendItem } from '@/types';

export function RadarLayout() {
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
    totalTrends,
    keywordMatchCount,
    fakeWarningCount,
    sourceCoverage,
    unreadCount,
    refreshUnreadCount,
    notificationVersion,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    scoreRange,
    setScoreRange,
    showFake,
    setShowFake,
    matchFilter,
    setMatchFilter,
    timeRange,
    setTimeRange,
    displayedTrends,
    keywordFilter,
    setKeywordFilter,
    matchedKeywordList,
  } = useMonitor();

  const [selectedTrend, setSelectedTrend] = useState<TrendItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  return (
    <div className="radar-layout">
      <RadarSidebar
        keywords={keywords}
        totalTrends={totalTrends}
        keywordMatchCount={keywordMatchCount}
        fakeWarningCount={fakeWarningCount}
        sourceCoverage={sourceCoverage}
        onKeywordsChange={handleKeywordsChange}
      />

      <div className="radar-main">
        <RadarTopBar
          isLoading={isLoading}
          monitorEnabled={monitorEnabled}
          lastCheckAt={lastCheckAt}
          onRefresh={fetchTrends}
          onToggleMonitor={toggleMonitor}
          aiSummary={aiSummary}
          onFetchSummary={() => fetchSummary(trends)}
          notificationVersion={notificationVersion}
          onRefreshUnreadCount={refreshUnreadCount}
          unreadCount={unreadCount}
        />

        <RadarFilterTabs
          totalCount={displayedTrends.length}
          sourceFilter={sourceFilter}
          onSourceChange={setSourceFilter}
          sortBy={sortBy}
          setSortBy={setSortBy}
          sortOrder={sortOrder}
          setSortOrder={setSortOrder}
          scoreRange={scoreRange}
          setScoreRange={setScoreRange}
          showFake={showFake}
          setShowFake={setShowFake}
          matchFilter={matchFilter}
          setMatchFilter={setMatchFilter}
          timeRange={timeRange}
          setTimeRange={setTimeRange}
          keywordFilter={keywordFilter}
          setKeywordFilter={setKeywordFilter}
          matchedKeywordList={matchedKeywordList}
        />

        <RadarHotspotList
          trends={displayedTrends}
          isLoading={isLoading}
          onTrendClick={(trend) => {
            setSelectedTrend(trend);
            setDetailOpen(true);
          }}
        />
      </div>

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
