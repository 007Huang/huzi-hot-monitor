'use client';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { SourceType } from '@/types';

interface SourceTabsProps {
  value: string;
  onChange: (value: string) => void;
}

const sources = [
  { value: 'all', label: '全部', icon: '🌐' },
  { value: 'web-search', label: '搜索', icon: '🔍' },
  { value: 'twitter', label: 'Twitter', icon: '🐦' },
  { value: 'weibo', label: '微博', icon: '📢' },
  { value: 'zhihu', label: '知乎', icon: '💡' },
  { value: 'tech-news', label: '科技', icon: '💻' },
  { value: 'toutiao', label: '头条', icon: '📰' },
] as const;

export function SourceTabs({ value, onChange }: SourceTabsProps) {
  return (
    <Tabs value={value} onValueChange={onChange}>
      <TabsList className="bg-muted/50">
        {sources.map(s => (
          <TabsTrigger
            key={s.value}
            value={s.value}
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <span className="mr-1">{s.icon}</span>
            {s.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
