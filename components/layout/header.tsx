'use client';

export function Header() {
  return (
    <header className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <span className="text-2xl">🔥</span>
        <div>
          <h1 className="text-lg font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            Hot Monitor
          </h1>
          <p className="text-[10px] text-muted-foreground leading-none">
            AI 驱动的热点监控中心
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          GitHub
        </a>
      </div>
    </header>
  );
}
