'use client';

import { NumberTicker } from '@/components/ui/number-ticker';

interface CompactStatsProps {
  totalTrends: number;
  keywordMatchCount: number;
  fakeWarningCount: number;
  sourceCoverage: { current: number; total: number };
}

export function CompactStats({
  totalTrends,
  keywordMatchCount,
  fakeWarningCount,
  sourceCoverage,
}: CompactStatsProps) {
  return (
    <div className="space-y-2">
      <h4 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-[0.12em]">
        实时概览
      </h4>
      <div className="grid grid-cols-2 gap-1.5">
        <div className="rounded-lg bg-white/[0.03] border border-white/[0.05] px-2.5 py-2 transition-colors hover:bg-white/[0.05]">
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-0.5">热点</div>
          <NumberTicker value={totalTrends} className="text-lg font-bold text-cyan-400 font-mono" />
        </div>
        <div className="rounded-lg bg-white/[0.03] border border-white/[0.05] px-2.5 py-2 transition-colors hover:bg-white/[0.05]">
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-0.5">匹配</div>
          <NumberTicker value={keywordMatchCount} className="text-lg font-bold text-violet-400 font-mono" />
        </div>
        <div className="rounded-lg bg-white/[0.03] border border-white/[0.05] px-2.5 py-2 transition-colors hover:bg-white/[0.05]">
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-0.5">预警</div>
          <NumberTicker
            value={fakeWarningCount}
            className={`text-lg font-bold font-mono ${fakeWarningCount > 0 ? 'text-rose-400' : 'text-zinc-500'}`}
          />
        </div>
        <div className="rounded-lg bg-white/[0.03] border border-white/[0.05] px-2.5 py-2 transition-colors hover:bg-white/[0.05]">
          <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-0.5">数据源</div>
          <div className="flex items-baseline gap-0.5">
            <NumberTicker value={sourceCoverage.current} className="text-lg font-bold text-zinc-300 font-mono" />
            <span className="text-xs text-zinc-600">/{sourceCoverage.total}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
