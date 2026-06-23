'use client';

import { Button } from '@/components/ui/button';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  if (totalPages <= 1 && totalItems <= pageSize) return null;

  // 计算显示的页码
  const getPageNumbers = (): (number | 'ellipsis')[] => {
    const pages: (number | 'ellipsis')[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);

      if (currentPage <= 3) {
        start = 2;
        end = Math.min(maxVisible, totalPages - 1);
      } else if (currentPage >= totalPages - 2) {
        start = totalPages - maxVisible + 1;
        end = totalPages - 1;
      }

      if (start > 2) pages.push('ellipsis');
      for (let i = start; i <= end; i++) pages.push(i);
      if (end < totalPages - 1) pages.push('ellipsis');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="flex items-center justify-between pt-3 pb-1">
      {/* 左侧：总数 + 每页条数 */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-muted-foreground">
          共 {totalItems} 条
        </span>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="h-5 text-[10px] px-1 rounded bg-muted/50 border border-border text-foreground cursor-pointer outline-none"
        >
          <option value={20}>20/页</option>
          <option value={30}>30/页</option>
          <option value={50}>50/页</option>
          <option value={100}>100/页</option>
        </select>
      </div>

      {/* 右侧：页码 */}
      <div className="flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="xs"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="h-6 w-6 p-0 text-[10px] text-muted-foreground hover:text-foreground disabled:opacity-30"
        >
          ◀
        </Button>

        {getPageNumbers().map((page, idx) =>
          page === 'ellipsis' ? (
            <span key={`e-${idx}`} className="text-[10px] text-muted-foreground px-1">
              ...
            </span>
          ) : (
            <Button
              key={page}
              variant="ghost"
              size="xs"
              onClick={() => onPageChange(page)}
              className={`h-6 w-6 p-0 text-[10px] ${
                currentPage === page
                  ? 'bg-primary/20 text-primary font-bold ring-1 ring-primary/40'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              {page}
            </Button>
          )
        )}

        <Button
          variant="ghost"
          size="xs"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="h-6 w-6 p-0 text-[10px] text-muted-foreground hover:text-foreground disabled:opacity-30"
        >
          ▶
        </Button>
      </div>
    </div>
  );
}
