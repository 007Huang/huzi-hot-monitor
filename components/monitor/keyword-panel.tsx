'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SparklesText } from '@/components/ui/sparkles-text';
import { ScrollArea } from '@/components/ui/scroll-area';
import { addKeyword, removeKeyword, toggleKeyword, getKeywords } from '@/lib/store';
import type { MonitorKeyword } from '@/types';

interface KeywordPanelProps {
  onKeywordsChange?: (keywords: MonitorKeyword[]) => void;
}

export function KeywordPanel({ onKeywordsChange }: KeywordPanelProps) {
  const [keywords, setKeywords] = useState<MonitorKeyword[]>(() => getKeywords());
  const [newKeyword, setNewKeyword] = useState('');

  const handleAdd = () => {
    const trimmed = newKeyword.trim();
    if (!trimmed) return;
    if (keywords.some(k => k.keyword.toLowerCase() === trimmed.toLowerCase())) return;

    const added = addKeyword(trimmed);
    const updated = [...keywords, added];
    setKeywords(updated);
    setNewKeyword('');
    onKeywordsChange?.(updated);
  };

  const handleRemove = (id: string) => {
    removeKeyword(id);
    const updated = keywords.filter(k => k.id !== id);
    setKeywords(updated);
    onKeywordsChange?.(updated);
  };

  const handleToggle = (id: string) => {
    toggleKeyword(id);
    const updated = keywords.map(k =>
      k.id === id ? { ...k, active: !k.active } : k
    );
    setKeywords(updated);
    onKeywordsChange?.(updated);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAdd();
  };

  const activeCount = keywords.filter(k => k.active).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <SparklesText className="text-base font-bold">监控关键词</SparklesText>
        <Badge variant="secondary" className="text-[10px]">
          {activeCount}/{keywords.length} 活跃
        </Badge>
      </div>

      {/* 添加关键词 */}
      <div className="flex gap-2">
        <Input
          value={newKeyword}
          onChange={e => setNewKeyword(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入关键词，如 GPT-5"
          className="h-8 text-sm bg-muted/50 border-border"
        />
        <Button
          onClick={handleAdd}
          size="sm"
          className="h-8 px-3 bg-primary hover:bg-primary/90"
          disabled={!newKeyword.trim()}
        >
          + 添加
        </Button>
      </div>

      {/* 关键词列表 */}
      <ScrollArea className="max-h-[280px]">
        {keywords.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground text-xs">
            还没有监控关键词<br />添加关键词开始监控
          </div>
        ) : (
          <div className="space-y-1.5">
            {keywords.map(kw => (
              <div
                key={kw.id}
                className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md transition-colors ${
                  kw.active
                    ? 'bg-primary/10 border border-primary/20'
                    : 'bg-muted/30 border border-transparent opacity-50'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <button
                    onClick={() => handleToggle(kw.id)}
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      kw.active ? 'bg-primary animate-pulse' : 'bg-muted-foreground/30'
                    }`}
                    title={kw.active ? '点击暂停' : '点击启用'}
                  />
                  <span className="text-sm truncate">{kw.keyword}</span>
                  {kw.lastMatchedAt && (
                    <span className="text-[10px] text-muted-foreground flex-shrink-0">
                      🎯
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleRemove(kw.id)}
                  className="text-muted-foreground hover:text-destructive text-xs flex-shrink-0 transition-colors"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
