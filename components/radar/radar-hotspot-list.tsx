'use client';

import { useState, useMemo } from 'react';
import { TrendCard } from '@/components/trends/trend-card';
import { Pagination } from '@/components/ui/pagination';
import type { TrendItem } from '@/types';

interface RadarHotspotListProps {
  trends: TrendItem[];
  isLoading?: boolean;
  /** 占位：条目点击回调 */
  onTrendClick?: (trend: TrendItem) => void;
  showMatchReason?: boolean;
}

export function RadarHotspotList({ trends, isLoading, onTrendClick, showMatchReason }: RadarHotspotListProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);

  const totalPages = Math.max(1, Math.ceil(trends.length / pageSize));

  const pageTrends = useMemo(() => {
    const start = (page - 1) * pageSize;
    return trends.slice(start, start + pageSize);
  }, [trends, page, pageSize]);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1) newPage = 1;
    if (newPage > totalPages) newPage = totalPages;
    setPage(newPage);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1);
  };

  if (isLoading) {
    return (
      <div className="radar-hotspot-list">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-14 rounded-lg bg-muted/30 animate-pulse" />
        ))}
      </div>
    );
  }

  if (trends.length === 0) {
    return (
      <div className="radar-hotspot-list">
        <div className="radar-hotspot-empty">
          <div className="text-3xl mb-2">🔍</div>
          <p className="text-sm">暂无热点数据</p>
          <p className="text-xs mt-1 text-muted-foreground/70">点击刷新按钮或添加监控关键词</p>
        </div>
      </div>
    );
  }

  return (
    <div className="radar-hotspot-list">
      {/* 列表 */}
      <div className="radar-hotspot-items">
        {pageTrends.map((trend, idx) => (
          <TrendCard
            key={trend.id}
            trend={trend}
            rank={(page - 1) * pageSize + idx + 1}
            onClick={onTrendClick}
            showMatchReason={showMatchReason}
          />
        ))}
      </div>

      {/* 分页器 */}
      <Pagination
        currentPage={page}
        totalPages={totalPages}
        totalItems={trends.length}
        pageSize={pageSize}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
      />
    </div>
  );
}
