'use client';

import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { KeywordPanel } from '@/components/monitor/keyword-panel';
import { CompactStats } from '@/components/dashboard/compact-stats';
import type { MonitorKeyword } from '@/types';

interface SidebarProps {
  keywords: MonitorKeyword[];
  totalTrends: number;
  keywordMatchCount: number;
  fakeWarningCount: number;
  sourceCoverage: { current: number; total: number };
  onKeywordsChange: (keywords: MonitorKeyword[]) => void;
  unreadCount: number;
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

export function Sidebar({
  keywords,
  totalTrends,
  keywordMatchCount,
  fakeWarningCount,
  sourceCoverage,
  onKeywordsChange,
  unreadCount,
  isMobileOpen,
  onMobileClose,
}: SidebarProps) {
  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* 实时概览 */}
      <div className="flex-shrink-0 px-3 pt-3 pb-1.5">
        <CompactStats
          totalTrends={totalTrends}
          keywordMatchCount={keywordMatchCount}
          fakeWarningCount={fakeWarningCount}
          sourceCoverage={sourceCoverage}
        />
      </div>

      <Separator className="bg-sidebar-border/50 mx-3" />

      {/* 关键词监控面板 */}
      <div className="flex-1 min-h-0 p-3 overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[11px] font-semibold text-sidebar-foreground/80 uppercase tracking-wider flex items-center gap-1.5">
            🎯 关键词监控
            <Badge variant="secondary" className="text-[9px] px-1 py-0 h-3.5 font-normal">
              {keywords.filter(k => k.active).length}/{keywords.length}
            </Badge>
          </h3>
        </div>
        <KeywordPanel onKeywordsChange={onKeywordsChange} />
      </div>
    </div>
  );

  return (
    <>
      {/* 桌面端侧边栏 */}
      <aside className="hidden md:flex flex-col w-60 flex-shrink-0 h-screen border-r border-sidebar-border bg-sidebar text-sidebar-foreground overflow-hidden">
        {sidebarContent}
      </aside>

      {/* 移动端 Sheet */}
      <Sheet open={isMobileOpen} onOpenChange={(open) => !open && onMobileClose()}>
        <SheetContent side="left" className="w-72 p-0 bg-sidebar text-sidebar-foreground border-sidebar-border">
          <SheetHeader className="px-3 pt-3 pb-0">
            <SheetTitle className="text-sm flex items-center gap-1.5">
              🔥 Hot Monitor
              {unreadCount > 0 && (
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                  {unreadCount}
                </Badge>
              )}
            </SheetTitle>
          </SheetHeader>
          <Separator className="bg-sidebar-border" />
          {sidebarContent}
        </SheetContent>
      </Sheet>
    </>
  );
}
