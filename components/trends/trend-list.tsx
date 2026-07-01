'use client';

import { useState, useMemo } from 'react';
import { TrendCard } from './trend-card';
import { Pagination } from '@/components/ui/pagination';
import type { TrendItem } from '@/types';

interface TrendListProps {
  trends: TrendItem[];
  isLoading?: boolean;
  onTrendClick?: (trend: TrendItem) => void;
  showMatchReason?: boolean;
}

export function TrendList({ trends, isLoading, onTrendClick, showMatchReason }: TrendListProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);

  const totalPages = Math.max(1, Math.ceil(trends.length / pageSize));

  // 当前页数据
  const pageTrends = useMemo(() => {
    const start = (page - 1) * pageSize;
    return trends.slice(start, start + pageSize);
  }, [trends, page, pageSize]);

  // 页码变化时如果超出范围则重置
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
      <div className="space-y-1">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-12 rounded-lg bg-muted/30 animate-pulse" />
        ))}
      </div>
    );
  }

  if (trends.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <div className="text-3xl mb-2">🔍</div>
        <p className="text-sm">暂无热点数据</p>
        <p className="text-xs mt-1 text-muted-foreground/70">点击刷新按钮或添加监控关键词</p>
      </div>
    );
  }

  return (
    <div>
      {/* 列表 */}
      <div className="space-y-0.5">
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
