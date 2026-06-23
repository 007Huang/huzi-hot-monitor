'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { SortBy, SortOrder, ShowFake, MatchFilter, TimeRange, MatchedKeywordSummary } from '@/lib/use-monitor';

interface TrendListHeaderProps {
  totalCount: number;
  sourceFilter: string;
  onSourceChange: (value: string) => void;
  sortBy: SortBy;
  setSortBy: (sort: SortBy) => void;
  sortOrder: SortOrder;
  setSortOrder: (order: SortOrder) => void;
  scoreRange: [number, number];
  setScoreRange: (range: [number, number]) => void;
  showFake: ShowFake;
  setShowFake: (filter: ShowFake) => void;
  matchFilter: MatchFilter;
  setMatchFilter: (filter: MatchFilter) => void;
  timeRange: TimeRange;
  setTimeRange: (range: TimeRange) => void;
  keywordFilter: string | null;
  setKeywordFilter: (keyword: string | null) => void;
  matchedKeywordList: MatchedKeywordSummary[];
}

const sources = [
  { value: 'all', icon: '🌐', label: '全部' },
  { value: 'web-search', icon: '🔍', label: '搜索' },
  { value: 'twitter', icon: '🐦', label: 'Twitter' },
  { value: 'weibo', icon: '📢', label: '微博' },
  { value: 'zhihu', icon: '💡', label: '知乎' },
  { value: 'tech-news', icon: '💻', label: '科技' },
  { value: 'toutiao', icon: '📰', label: '头条' },
] as const;

const columnHeaders: { key: SortBy; label: string }[] = [
  { key: 'score', label: '🔥 热度' },
  { key: 'title', label: '标题' },
  { key: 'source', label: '📂 来源' },
  { key: 'time', label: '🕐 时间' },
];

export function TrendListHeader({
  totalCount,
  sourceFilter,
  onSourceChange,
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
  keywordFilter,
  setKeywordFilter,
  matchedKeywordList,
}: TrendListHeaderProps) {
  const handleSort = (key: SortBy) => {
    if (sortBy === key) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(key);
      setSortOrder('desc');
    }
  };

  const hasActiveFilters =
    scoreRange[0] > 0 || scoreRange[1] < 100 ||
    showFake !== 'all' ||
    matchFilter !== 'all' ||
    timeRange !== '7d';

  const resetFilters = () => {
    setScoreRange([0, 100]);
    setShowFake('all');
    setMatchFilter('all');
    setTimeRange('7d');
  };

  return (
    <div className="space-y-2 mb-2">
      {/* 第一行：标题 + 总数 */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold flex items-center gap-2">
          🔥 热点排行
          <span className="text-[10px] text-muted-foreground font-normal">{totalCount} 条</span>
        </h2>
      </div>

      {/* 第二行：来源按钮 + 下拉筛选条件 */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* 来源图标按钮 */}
        <div className="flex items-center gap-0.5">
          {sources.map(s => (
            <Tooltip key={s.value}>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => onSourceChange(s.value)}
                    className={`h-7 w-8 p-0 text-sm ${
                      sourceFilter === s.value
                        ? 'bg-primary/20 text-primary ring-1 ring-primary/40'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}
                  />
                }
              >
                {s.icon}
              </TooltipTrigger>
              <TooltipContent side="bottom">{s.label}</TooltipContent>
            </Tooltip>
          ))}
        </div>

        <span className="text-[10px] text-muted-foreground">|</span>

        {/* 热度区间 */}
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-muted-foreground">热度</span>
          <Input
            type="number"
            min={0}
            max={100}
            value={scoreRange[0]}
            onChange={(e) => setScoreRange([Math.max(0, Number(e.target.value)), scoreRange[1]])}
            className="h-5 w-8 text-[10px] text-center px-0.5 bg-muted/50 border-border"
          />
          <span className="text-[10px] text-muted-foreground">-</span>
          <Input
            type="number"
            min={0}
            max={100}
            value={scoreRange[1]}
            onChange={(e) => setScoreRange([scoreRange[0], Math.min(100, Number(e.target.value))])}
            className="h-5 w-8 text-[10px] text-center px-0.5 bg-muted/50 border-border"
          />
        </div>

        <span className="text-[10px] text-muted-foreground">|</span>

        {/* 验证 - 下拉 */}
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-muted-foreground">验证</span>
          <select
            value={showFake}
            onChange={(e) => setShowFake(e.target.value as ShowFake)}
            className={`h-5 text-[10px] px-1.5 rounded border outline-none cursor-pointer ${
              showFake !== 'all'
                ? 'bg-primary/15 border-primary/30 text-primary'
                : 'bg-muted/50 border-border text-foreground'
            }`}
          >
            <option value="all">全部</option>
            <option value="fake">⚠️虚假</option>
            <option value="real">✅真实</option>
          </select>
        </div>

        <span className="text-[10px] text-muted-foreground">|</span>

        {/* 匹配 - 下拉 */}
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-muted-foreground">匹配</span>
          <select
            value={matchFilter}
            onChange={(e) => setMatchFilter(e.target.value as MatchFilter)}
            className={`h-5 text-[10px] px-1.5 rounded border outline-none cursor-pointer ${
              matchFilter !== 'all'
                ? 'bg-primary/15 border-primary/30 text-primary'
                : 'bg-muted/50 border-border text-foreground'
            }`}
          >
            <option value="all">全部</option>
            <option value="matched">🎯已匹配</option>
            <option value="unmatched">未匹配</option>
          </select>
        </div>

        <span className="text-[10px] text-muted-foreground">|</span>

        {/* 时间 - 下拉 */}
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-muted-foreground">时间</span>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as TimeRange)}
            className={`h-5 text-[10px] px-1.5 rounded border outline-none cursor-pointer ${
              timeRange !== '7d'
                ? 'bg-primary/15 border-primary/30 text-primary'
                : 'bg-muted/50 border-border text-foreground'
            }`}
          >
            <option value="1h">1小时</option>
            <option value="6h">6小时</option>
            <option value="24h">24小时</option>
            <option value="7d">7天</option>
            <option value="all">全部</option>
          </select>
        </div>

        {/* 重置 */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="xs"
            onClick={resetFilters}
            className="h-5 px-1.5 text-[10px] text-muted-foreground hover:text-destructive"
          >
            重置
          </Button>
        )}
      </div>

      {/* 第三行：关键词筛选标签（仅在有关键词匹配时显示） */}
      {matchedKeywordList.length > 0 && (
        <div className="flex items-center gap-1 flex-wrap pb-1">
          {keywordFilter && (
            <button
              onClick={() => setKeywordFilter(null)}
              className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted/50 text-muted-foreground border border-border/50 hover:text-foreground transition-colors"
            >
              全部 ✕
            </button>
          )}
          {matchedKeywordList.map(({ keyword, count }) => (
            <button
              key={keyword}
              onClick={() => setKeywordFilter(keywordFilter === keyword ? null : keyword)}
              className={`text-[10px] px-1.5 py-0.5 rounded-full border transition-colors ${
                keywordFilter === keyword
                  ? 'bg-primary/20 text-primary border-primary/40 font-semibold'
                  : 'bg-muted/20 text-muted-foreground border-border/30 hover:bg-muted/40 hover:text-foreground'
              }`}
            >
              {keyword} <span className="text-[9px] opacity-70">×{count}</span>
            </button>
          ))}
        </div>
      )}

      {/* 第四行：可排序列头 */}
      <div className="flex items-center gap-0 text-[11px] text-muted-foreground border-b border-border/20 pb-1">
        <span className="w-8 flex-shrink-0 text-center">#</span>
        <span className="w-6 flex-shrink-0 text-center">方向</span>

        {columnHeaders.map(col => (
          <button
            key={col.key}
            onClick={() => handleSort(col.key)}
            className={`flex items-center gap-0.5 px-2 py-0.5 rounded transition-colors ${
              sortBy === col.key
                ? 'text-primary font-semibold bg-primary/10'
                : 'hover:text-foreground hover:bg-muted/30'
            }`}
          >
            {col.label}
            {sortBy === col.key && (
              <span className="text-[9px]">{sortOrder === 'desc' ? '▼' : '▲'}</span>
            )}
          </button>
        ))}

        <span className="ml-auto flex items-center gap-1.5 text-[10px]">
          <span>匹配</span>
          <span>来源</span>
        </span>
      </div>
    </div>
  );
}
