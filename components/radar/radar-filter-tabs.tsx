'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { SortBy, SortOrder, ShowFake, MatchFilter, TimeRange, MatchedKeywordSummary } from '@/lib/use-monitor';

interface RadarFilterTabsProps {
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
  showAllMatchReasons: boolean;
  toggleAllMatchReasons: () => void;
  hasMatchReasons: boolean;
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

export function RadarFilterTabs({
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
  showAllMatchReasons,
  toggleAllMatchReasons,
  hasMatchReasons,
}: RadarFilterTabsProps) {
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
    <div className="radar-filter-bar-wrapper">
      {/* 标题 + 总数 */}
      <div className="radar-filter-title-row">
        <h2 className="radar-filter-title">
          🔥 热点排行
          <span className="radar-filter-count">{totalCount} 条</span>
        </h2>
      </div>

      {/* 来源图标按钮 + 筛选条件 */}
      <div className="radar-filter-controls">
        {/* 来源图标按钮 */}
        <div className="radar-filter-sources">
          {sources.map(s => (
            <Tooltip key={s.value}>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => onSourceChange(s.value)}
                    className={`h-8 w-9 p-0 text-base ${
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

        <span className="radar-filter-divider">|</span>

        {/* 热度区间 */}
        <div className="radar-filter-group">
          <span className="radar-filter-label">热度</span>
          <Input
            type="number"
            min={0}
            max={100}
            value={scoreRange[0]}
            onChange={(e) => setScoreRange([Math.max(0, Number(e.target.value)), scoreRange[1]])}
            className="h-6 w-10 text-xs text-center px-1 bg-muted/50 border-border"
          />
          <span className="radar-filter-label">-</span>
          <Input
            type="number"
            min={0}
            max={100}
            value={scoreRange[1]}
            onChange={(e) => setScoreRange([scoreRange[0], Math.min(100, Number(e.target.value))])}
            className="h-6 w-10 text-xs text-center px-1 bg-muted/50 border-border"
          />
        </div>

        <span className="radar-filter-divider">|</span>

        {/* 验证 */}
        <div className="radar-filter-group">
          <span className="radar-filter-label">验证</span>
          <select
            value={showFake}
            onChange={(e) => setShowFake(e.target.value as ShowFake)}
            className={`radar-filter-select ${
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

        <span className="radar-filter-divider">|</span>

        {/* 匹配 */}
        <div className="radar-filter-group">
          <span className="radar-filter-label">匹配</span>
          <select
            value={matchFilter}
            onChange={(e) => setMatchFilter(e.target.value as MatchFilter)}
            className={`radar-filter-select ${
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

        <span className="radar-filter-divider">|</span>

        {/* 时间 */}
        <div className="radar-filter-group">
          <span className="radar-filter-label">时间</span>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as TimeRange)}
            className={`radar-filter-select ${
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
            className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
          >
            重置
          </Button>
        )}

        {/* 一键展开/折叠匹配理由 */}
        {hasMatchReasons && (
          <Button
            variant="ghost"
            size="xs"
            onClick={toggleAllMatchReasons}
            className="h-6 px-2 text-xs text-primary/70 hover:text-primary transition-colors"
          >
            {showAllMatchReasons ? '📋 折叠理由' : '📋 展开理由'}
          </Button>
        )}
      </div>

      {/* 关键词筛选标签 */}
      {matchedKeywordList.length > 0 && (
        <div className="radar-filter-keywords">
          {keywordFilter && (
            <button
              onClick={() => setKeywordFilter(null)}
              className="radar-filter-keyword-tag radar-filter-keyword-reset"
            >
              全部 ✕
            </button>
          )}
          {matchedKeywordList.map(({ keyword, count }) => (
            <button
              key={keyword}
              onClick={() => setKeywordFilter(keywordFilter === keyword ? null : keyword)}
              className={`radar-filter-keyword-tag ${
                keywordFilter === keyword
                  ? 'radar-filter-keyword-active'
                  : ''
              }`}
            >
              {keyword} <span className="opacity-70">×{count}</span>
            </button>
          ))}
        </div>
      )}

      {/* 可排序列头 */}
      <div className="radar-filter-columns">
        <span className="radar-filter-col-rank">#</span>
        <span className="radar-filter-col-dir">方向</span>

        {([
          { key: 'score' as SortBy, label: '🔥 热度' },
          { key: 'title' as SortBy, label: '标题' },
          { key: 'source' as SortBy, label: '📂 来源' },
          { key: 'time' as SortBy, label: '🕐 时间' },
        ]).map(col => (
          <button
            key={col.key}
            onClick={() => handleSort(col.key)}
            className={`radar-filter-col-header ${
              sortBy === col.key
                ? 'radar-filter-col-active'
                : ''
            }`}
          >
            {col.label}
            {sortBy === col.key && (
              <span className="text-[9px]">{sortOrder === 'desc' ? '▼' : '▲'}</span>
            )}
          </button>
        ))}

        <span className="radar-filter-col-meta">匹配 来源</span>
      </div>
    </div>
  );
}
