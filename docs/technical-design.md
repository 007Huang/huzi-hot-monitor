# 🔥 鱼皮热点监控 (Hot Monitor) - 技术方案

## 技术栈

| 层级 | 选型 | 理由 |
|------|------|------|
| 框架 | Next.js 15 App Router + TypeScript | 全栈能力，API Routes 内置 |
| 样式 | Tailwind CSS + shadcn/ui + Magic UI | 独特动画效果，不像模板 |
| AI | OpenRouter API → DeepSeek Chat | 便宜、推理能力强 (~$0.14/1M tokens) |
| 数据源 | 网页搜索爬虫 (cheerio) + Twitter API (twitterapi.io) | 多源获取，避免单一依赖 |
| 通知 | 浏览器通知 + Resend 邮件 | 实时+离线双重保障 |
| 存储 | localStorage | 轻量工具，无需数据库 |
| 部署 | Vercel | 免费额度，与 Next.js 完美集成 |

## 视觉设计

### 主题
- **暗色主题**：深色背景 (#0f172a)，营造"监控中心"氛围
- **热力配色**：
  - 主色：橙/琥珀 (#f59e0b) — "火热"
  - 辅色：青蓝 (#06b6d4) — "科技"
  - 强调色：红色 (#ef4444) — "紧急/突发"
  - 成功色：翠绿 (#10b981) — "已确认"

### 动画特效（Magic UI）
| 组件 | 用途 |
|------|------|
| Marquee | 顶部滚动最新热点头条 |
| Animated List | 热点列表逐项出现动画 |
| Border Beam | 高亮最热项的发光边框 |
| Number Ticker | 热度分数数字跳动 |
| Shimmer Button | "刷新热点"按钮微光效果 |
| Sparkles Text | 活跃监控关键词闪烁 |
| Bento Grid | 仪表盘不规则网格布局 |
| Blur Fade | 内容淡入过渡 |

---

## 项目结构

```
huzi-hot-monitor/
├── app/
│   ├── layout.tsx              # 根布局（暗色主题）
│   ├── page.tsx                # 首页/仪表盘
│   ├── globals.css             # 全局样式 + Tailwind
│   └── api/
│       ├── trends/
│       │   └── route.ts        # GET 聚合热点数据
│       ├── search/
│       │   └── route.ts        # GET 网页搜索爬虫
│       ├── twitter/
│       │   └── route.ts        # GET Twitter 数据
│       ├── ai/
│       │   ├── match/
│       │   │   └── route.ts    # POST 关键词匹配
│       │   ├── detect/
│       │   │   └── route.ts    # POST 假内容检测
│       │   └── summarize/
│       │       └── route.ts    # POST 热点摘要
│       └── notify/
│           └── route.ts        # POST 发送通知
├── components/
│   ├── ui/                     # shadcn/Magic UI 组件
│   ├── trends/
│   │   ├── trend-card.tsx      # 热点卡片
│   │   ├── trend-list.tsx      # 热点列表
│   │   ├── trend-detail.tsx    # 热点详情弹窗
│   │   ├── marquee-header.tsx  # 滚动头条
│   │   └── source-tabs.tsx     # 数据源筛选
│   ├── monitor/
│   │   ├── keyword-panel.tsx   # 关键词管理
│   │   ├── monitor-status.tsx  # 监控状态指示
│   │   └── notification-log.tsx # 通知记录
│   └── layout/
│       ├── header.tsx          # 页头
│       └── dashboard-grid.tsx  # 仪表盘网格
├── lib/
│   ├── sources/
│   │   ├── web-search.ts       # 网页搜索爬虫
│   │   └── twitter.ts          # Twitter API 客户端
│   ├── ai.ts                   # OpenRouter 集成
│   ├── notify.ts               # 通知工具
│   ├── store.ts                # localStorage 管理
│   └── utils.ts                # 工具函数
├── types/
│   └── index.ts                # TypeScript 类型定义
├── docs/
│   ├── requirements.md         # 需求文档
│   └── technical-design.md     # 技术方案（本文件）
├── .env.local                  # 环境变量（不提交）
├── .env.example                # 环境变量模板
└── package.json
```

---

## 核心模块设计

### 1. 数据源层

#### 1.1 网页搜索爬虫 (`lib/sources/web-search.ts`)

**策略**：后端 Route Handler 中使用 `fetch` + `cheerio` 解析搜索结果

```typescript
// 核心实现思路
import * as cheerio from 'cheerio';

interface SearchOptions {
  keyword: string;
  language?: string;    // 搜索语言
  fresh?: string;       // 时间范围: 'day' | 'week' | 'month'
}

async function webSearch(options: SearchOptions): Promise<TrendItem[]> {
  // 1. 构建搜索URL（Google/Bing）
  // 2. fetch 获取搜索结果页面
  // 3. cheerio 解析搜索结果
  // 4. 提取标题、链接、摘要
  // 5. 返回统一格式的 TrendItem[]
}
```

**频率控制**：
- 同一关键词 5 分钟内不重复搜索
- 请求间随机延迟 1-3 秒
- User-Agent 伪装
- 搜索失败时自动切换备用搜索引擎

**支持的搜索目标**：
- Google 搜索（主要）
- Bing 搜索（备用）
- TechCrunch / The Verge 等科技站点的站内搜索

#### 1.2 Twitter API (`lib/sources/twitter.ts`)

**对接方式**：通过 [twitterapi.io](https://twitterapi.io) 获取 Twitter/X 数据

```typescript
// 核心实现思路
interface TwitterOptions {
  keyword?: string;
  userId?: string;
}

async function fetchTwitterTrends(options: TwitterOptions): Promise<TrendItem[]> {
  // 1. 调用 twitterapi.io 接口
  // 2. 搜索推文 / 获取热门话题
  // 3. 解析返回数据
  // 4. 返回统一格式的 TrendItem[]
}
```

**API 使用**：
- 认证方式：API Key（Header: `x-api-key`）
- 主要端点：搜索推文、获取用户最新推文
- 频率控制：遵循 API 限制

#### 1.3 统一数据模型

```typescript
// types/index.ts
type SourceType = 'web-search' | 'twitter';

interface TrendItem {
  id: string;
  title: string;
  url: string;
  description?: string;
  score: number;           // 热度分数 (0-100)
  source: SourceType;
  sourceLabel: string;     // 显示名: '网页搜索' | 'Twitter'
  tags?: string[];         // AI 提取的标签
  author?: string;         // 作者 (Twitter)
  isFake?: boolean;        // AI 判断是否为虚假内容
  fakeReason?: string;     // 判断为虚假的原因
  matchedKeywords?: string[]; // 匹配到的关键词
  createdAt: string;       // 内容发布时间 (ISO)
  fetchedAt: string;       // 抓取时间 (ISO)
}

interface MonitorKeyword {
  id: string;
  keyword: string;
  scope?: string;          // 监控范围: 'all' | 'web-search' | 'twitter'
  active: boolean;
  createdAt: string;
  lastMatchedAt?: string;
}

interface NotificationLog {
  id: string;
  keyword: string;
  trendTitle: string;
  trendUrl: string;
  source: SourceType;
  isFake: boolean;
  notifiedAt: string;
}
```

---

### 2. AI 集成 (`lib/ai.ts`)

**对接方式**：使用 OpenAI Node.js SDK，`baseURL` 指向 OpenRouter

```typescript
import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    'HTTP-Referer': 'https://huzi-hot-monitor.app',
    'X-OpenRouter-Title': 'Hot Monitor',
  },
});

const DEFAULT_MODEL = 'deepseek/deepseek-chat';
```

**API 调用方式** (参考 OpenAI SDK 文档)：

```typescript
const completion = await client.chat.completions.create({
  model: DEFAULT_MODEL,
  messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ],
  temperature: 0.3,
  max_tokens: 500,
});
```

#### 2.1 关键词匹配 (`matchKeywords`)

**目的**：判断热点内容是否真正匹配用户监控的关键词，而非仅靠字符串包含

**System Prompt**：
```
你是一个热点内容分析专家。判断给定的热点内容是否真正与用户监控的关键词相关。
要求：
1. 不要仅靠关键词字符串匹配，要理解语义
2. "GPT" 应匹配 "GPT-5发布" 但不应匹配 "GPT格式化硬盘"
3. 返回 JSON: { "matched": boolean, "confidence": number, "reason": string }
```

#### 2.2 假内容检测 (`detectFake`)

**目的**：识别标题党、虚假更新传闻等误导性内容

**System Prompt**：
```
你是一个内容真实性判断专家。判断给定的热点内容是否可能是虚假或误导性的。
关注以下信号：
1. 标题党：标题夸大但内容不支撑
2. 虚假传闻：声称某产品发布但无官方来源
3. 翻译错误：中文媒体翻译外文时产生的误读
4. 过时信息：将旧新闻重新包装为新消息
返回 JSON: { "isFake": boolean, "confidence": number, "reason": string }
```

#### 2.3 热点摘要 (`summarizeTrends`)

**目的**：对热点列表生成简明摘要

**System Prompt**：
```
你是一个科技新闻摘要专家。对给定的热点列表生成简明的中文摘要。
要求：
1. 按重要性排序
2. 每个热点用1-2句话概括
3. 标注信息来源
4. 如果有多个相关热点，合并描述
```

---

### 3. 通知系统 (`lib/notify.ts`)

#### 3.1 浏览器通知

```typescript
// 前端调用
async function requestPermission(): Promise<boolean> {
  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

function sendBrowserNotification(title: string, body: string, url?: string) {
  if (Notification.permission !== 'granted') return;
  const notification = new Notification(title, { body, icon: '/icon.png' });
  notification.onclick = () => {
    window.focus();
    if (url) window.open(url);
  };
}
```

#### 3.2 Resend 邮件通知

```typescript
// 后端 API Route
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// 发送每日摘要邮件
async function sendDigestEmail(to: string, trends: TrendItem[]) {
  await resend.emails.send({
    from: 'Hot Monitor <onboarding@resend.dev>',
    to: [to],
    subject: '🔥 今日热点摘要',
    html: generateDigestHTML(trends),  // 生成邮件HTML
  });
}
```

---

### 4. 前端页面设计

#### 4.1 页面布局

```
┌─────────────────────────────────────────────────┐
│  🔥 Hot Monitor           [设置⚙️] [通知🔔]     │
├─────────────────────────────────────────────────┤
│  ← Marquee: 最新热点标题滚动 →                   │
├────────────┬─────────────┬──────────────────────┤
│  监控关键词  │  热点排行    │  AI 摘要             │
│  ┌───────┐ │  ┌────────┐ │  ┌─────────────────┐│
│  │✨AI编程│ │  │🔥#1 xxx│ │  │ 今日AI领域...    ││
│  │✨GPT   │ │  │  #2 xxx│ │  │                  ││
│  │ Claude │ │  │  #3 xxx│ │  │                  ││
│  │+ 添加  │ │  │  #4 xxx│ │  │                  ││
│  └───────┘ │  └────────┘ │  └─────────────────┘│
├────────────┴─────────────┴──────────────────────┤
│  [全部] [网页搜索] [Twitter]    [🔄 刷新] [⏱监控]│
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐   │
│  │ Card   │ │ Card   │ │ Card   │ │ Card   │   │
│  │Border  │ │        │ │        │ │        │   │
│  │Beam🔥  │ │        │ │        │ │        │   │
│  └────────┘ └────────┘ └────────┘ └────────┘   │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐   │
│  │ Card   │ │ Card   │ │ Card   │ │ Card   │   │
│  └────────┘ └────────┘ └────────┘ └────────┘   │
└─────────────────────────────────────────────────┘
```

#### 4.2 响应式适配
- **桌面** (>1024px)：三列 Bento Grid
- **平板** (768-1024px)：两列布局
- **手机** (<768px)：单列堆叠，关键词面板折叠

---

### 5. 监控调度

```typescript
// 客户端轮询机制
interface MonitorConfig {
  interval: number;        // 轮询间隔（毫秒），默认 300000 (5分钟)
  keywords: string[];      // 监控关键词
  sources: SourceType[];   // 数据源
  enabled: boolean;        // 是否启用
}

// 监控流程
async function runMonitorCycle(config: MonitorConfig) {
  // 1. 从各数据源获取最新热点
  const trends = await fetchTrends(config.keywords, config.sources);
  // 2. AI 匹配关键词
  const matched = await matchKeywords(trends, config.keywords);
  // 3. AI 检测假内容
  const verified = await detectFake(matched);
  // 4. 过滤已通知的项
  const newItems = filterNotified(verified);
  // 5. 发送通知
  for (const item of newItems) {
    sendBrowserNotification(item.title, item.description, item.url);
  }
  // 6. 记录通知日志
  saveNotificationLog(newItems);
}
```

---

### 6. Agent Skills

**在Web版功能完善后开发**，封装为 MCP 兼容的 API：

```
POST /api/skills/discover   → 发现热点
  Body: { scope: string, limit?: number }
  Response: { trends: TrendItem[] }

POST /api/skills/monitor    → 监控关键词变化
  Body: { keywords: string[], sources?: string[] }
  Response: { matched: TrendItem[], newItems: TrendItem[] }

POST /api/skills/summarize  → 生成热点摘要
  Body: { trends: TrendItem[], language?: string }
  Response: { summary: string }
```

---

## 环境变量

```env
# OpenRouter AI (必填)
OPENROUTER_API_KEY=sk-or-...

# Twitter API - twitterapi.io (必填)
TWITTER_API_KEY=...

# Resend Email (可选，不配置则仅使用浏览器通知)
RESEND_API_KEY=re_...

# 通知邮箱 (可选)
NOTIFY_EMAIL=your@email.com
```

## 开发顺序

| 阶段 | 内容 | 依赖 |
|------|------|------|
| Phase 1 | 项目初始化与基础架构 | 无 |
| Phase 2 | 数据源层（网页搜索爬虫 + Twitter API） | Phase 1 |
| Phase 3 | AI 集成（OpenRouter → DeepSeek） | Phase 1 |
| Phase 4 | 前端仪表盘（Magic UI + 暗色主题） | Phase 2, 3 |
| Phase 5 | 通知系统（浏览器通知 + Resend 邮件） | Phase 3, 4 |
| Phase 6 | 监控调度（客户端轮询 + 变化检测） | Phase 5 |
| Phase 7 | Agent Skills（MCP 兼容 API） | Phase 6 |

## 验证方案

1. **数据获取**：访问 `/api/trends?q=AI编程`，确认返回网页搜索 + Twitter 数据
2. **AI 功能**：添加关键词 "GPT"，确认能匹配到相关热点并排除假内容
3. **通知**：开启监控，等待匹配触发浏览器通知；配置邮件后收到每日摘要
4. **响应式**：在手机/平板/桌面端查看页面，确认布局适配
5. **Agent Skills**：用 curl 调用 Skill API，确认返回结构化数据
