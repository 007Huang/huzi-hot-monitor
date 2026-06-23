'use client';

import { Badge } from '@/components/ui/badge';
import { CompactStats } from '@/components/dashboard/compact-stats';
import { KeywordPanel } from '@/components/monitor/keyword-panel';
import { Separator } from '@/components/ui/separator';
import type { MonitorKeyword } from '@/types';

interface RadarSidebarProps {
  keywords: MonitorKeyword[];
  totalTrends: number;
  keywordMatchCount: number;
  fakeWarningCount: number;
  sourceCoverage: { current: number; total: number };
  onKeywordsChange: (newKeywords: MonitorKeyword[]) => void;
}

export function RadarSidebar({
  keywords,
  totalTrends,
  keywordMatchCount,
  fakeWarningCount,
  sourceCoverage,
  onKeywordsChange,
}: RadarSidebarProps) {
  const activeCount = keywords.filter(k => k.active).length;

  return (
    <aside className="radar-sidebar">
      {/* 顶部：品牌 Logo */}
      <div className="radar-sidebar-brand">
        <span className="radar-sidebar-logo-icon">📡</span>
        <span className="radar-sidebar-logo-text">HotPulse</span>
      </div>

      <Separator className="bg-white/[0.06] mx-3" />

      {/* 实时概览统计 */}
      <div className="flex-shrink-0 px-3 pt-3 pb-1">
        <CompactStats
          totalTrends={totalTrends}
          keywordMatchCount={keywordMatchCount}
          fakeWarningCount={fakeWarningCount}
          sourceCoverage={sourceCoverage}
        />
      </div>

      <Separator className="bg-white/[0.06] mx-3 mt-2" />

      {/* 关键词监控面板 */}
      <div className="flex-1 min-h-0 p-3 overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-[0.1em] flex items-center gap-1.5">
            关键词
            <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-3.5 font-medium bg-white/[0.06] text-zinc-400 border-0">
              {activeCount}/{keywords.length}
            </Badge>
          </h3>
        </div>
        <KeywordPanel onKeywordsChange={onKeywordsChange} />
      </div>

      {/* 底部：用户/状态区域 */}
      <div className="radar-sidebar-footer">
        <div className="radar-sidebar-user">
          <div className="radar-sidebar-avatar" />
          <div className="radar-sidebar-user-info">
            <div className="radar-sidebar-user-name">管理员</div>
            <div className="radar-sidebar-user-status">
              <span className="radar-status-dot" />
              在线
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
