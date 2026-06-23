'use client';

import { NumberTicker } from '@/components/ui/number-ticker';

interface StatItem {
  label: string;
  value: number;
  change: string;
  trend: 'up' | 'down' | 'stable';
}

interface RadarStatsCardsProps {
  stats: StatItem[];
}

const trendConfig = {
  up: { icon: '📈', color: 'radar-stat-trend-up' },
  down: { icon: '📉', color: 'radar-stat-trend-down' },
  stable: { icon: '➡️', color: 'radar-stat-trend-stable' },
};

export function RadarStatsCards({ stats }: RadarStatsCardsProps) {
  return (
    <div className="radar-stats-row">
      {stats.map((stat) => {
        const trend = trendConfig[stat.trend];
        return (
          <div key={stat.label} className="radar-stat-card">
            <div className="radar-stat-label">{stat.label}</div>
            <NumberTicker value={stat.value} className="radar-stat-value" />
            <div className={`radar-stat-change ${trend.color}`}>
              <span>{trend.icon}</span>
              <span>{stat.change}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
