# 🔥 API 集成技术文档

> 鱼皮热点监控 (Hot Monitor) 项目所集成的全部外部 API 参考
> 最后更新：2026-06

---

## 目录

1. [AI 服务 — Acedata.cloud](#1-ai服务--acedatacloud)
2. [数据源 — Twitter API](#2-数据源--twitter-api-twitterapiio)
3. [数据源 — 网页搜索爬虫](#3-数据源--网页搜索爬虫)
4. [通知服务 — Resend 邮件](#4-通知服务--resend-邮件)
5. [内部 API 路由](#5-内部-api-路由)
6. [Agent Skills API](#6-agent-skills-api)

---

## 1. AI服务 — Acedata.cloud

> 提供 AI 对话能力，用于关键词匹配、假内容检测、热点摘要、标签提取

### 基本信息

| 项目 | 值 |
|------|-----|
| **平台** | https://platform.acedata.cloud |
| **Endpoint** | `POST https://api.acedata.cloud/aichat2/conversations` |
| **文档** | https://platform.acedata.cloud/documents/aichat2-conversations-integration |
| **认证** | `Authorization: Bearer <ACEDATA_API_KEY>` |
| **环境变量** | `ACEDATA_API_KEY` |

### 请求格式

> ⚠️ **非标准 OpenAI 格式**，使用 `{ model, question }` 而非 `{ model, messages }`

```json
{
  "model": "gpt-5.4-mini",
  "question": "你的问题内容"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `model` | string | ✅ | 模型标识，见下方模型列表 |
| `question` | string | ✅ | 问题文本（system prompt + user prompt 拼接） |

### 响应格式

> ⚠️ 返回 `{ answer, id }` 而非标准 OpenAI 的 `{ choices: [...] }`

```json
{
  "answer": "AI 的回答内容",
  "id": "971d6415-cf88-4880-8fba-de1aa135e728"
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| `answer` | string | AI 模型的回答文本 |
| `id` | string | 本次对话的唯一标识 UUID |

### 错误响应

```json
{
  "error": {
    "message": "The token is invalid, please make sure your token is correct.",
    "code": "invalid_token"
  },
  "trace_id": "af4b13e2-..."
}
```

| HTTP 状态码 | 说明 |
|-------------|------|
| 401 | API Key 无效 |
| 402 | 账户余额不足 |
| 429 | 请求频率过高 |

### 可用模型

| 模型标识 | 说明 | 平均响应时间 | 性价比 |
|----------|------|-------------|--------|
| `gpt-5.4-mini` | GPT-5.4 Mini，响应快 | ~2s | ⭐⭐⭐⭐ |
| `deepseek-v4-flash` | DeepSeek V4 Flash，便宜 | ~4s | ⭐⭐⭐⭐⭐ |
| `gpt-5.4` | GPT-5.4，响应快质量高 | ~2.3s | ⭐⭐⭐ |
| `claude-opus-4-8` | Claude Opus 4.8，质量最高 | ~4.3s | ⭐⭐ |

### 项目中的集成方式

```typescript
// lib/ai.ts
const ACEDATA_BASE_URL = 'https://api.acedata.cloud/aichat2/conversations';

async function callAI(systemPrompt: string, userPrompt: string): Promise<string> {
  const question = `${systemPrompt}\n\n${userPrompt}`;  // 拼接为单个 question

  const response = await fetch(ACEDATA_BASE_URL, {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'Authorization': `Bearer ${ACEDATA_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, question }),
  });

  const data = await response.json();
  return data.answer;
}
```

**降级策略**：配置 `MODEL_FALLBACKS` 数组，按优先级依次尝试，成功则缓存该模型：

```typescript
const MODEL_FALLBACKS = [
  'gpt-5.4-mini',       // 优先：快且便宜
  'deepseek-v4-flash',  // 备用：更便宜
];
```

### 四个 AI 功能

| 功能 | 函数 | 输入 | 输出 | 降级策略 |
|------|------|------|------|---------|
| 关键词匹配 | `matchKeywords()` | 标题+描述+关键词 | `{ matched, confidence, reason }` | 字符串包含匹配 |
| 假内容检测 | `detectFake()` | 标题+描述+URL | `{ isFake, confidence, reason }` | 默认为真实 |
| 热点摘要 | `summarizeTrends()` | TrendItem[] | `{ summary, topTopics }` | 取前5条标题 |
| 标签提取 | `extractTags()` | 标题+描述 | `string[]` | 返回空数组 |

### 与标准 OpenAI API 差异

| 维度 | 标准 OpenAI | Acedata aichat2 |
|------|-----------|----------------|
| 请求体 | `{ model, messages: [{role, content}] }` | `{ model, question }` |
| 系统提示 | `role: "system"` 消息 | 拼入 question 字符串 |
| 响应体 | `choices[0].message.content` | `answer` |
| SDK | OpenAI SDK | 原生 fetch |

---

## 2. 数据源 — Twitter API (twitterapi.io)

> 获取 Twitter/X 热搜趋势和推文搜索

### 基本信息

| 项目 | 值 |
|------|-----|
| **平台** | https://twitterapi.io |
| **Base URL** | `https://api.twitterapi.io` |
| **认证** | `x-api-key: <TWITTER_API_KEY>` |
| **环境变量** | `TWITTER_API_KEY` |

### 使用的端点

#### 搜索推文

```
GET https://api.twitterapi.io/twitter/search?query=<keyword>&limit=<count>
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `query` | string | 搜索关键词 |
| `limit` | number | 返回条数 |

#### 获取趋势

```
GET https://api.twitterapi.io/twitter/trends
```

### 项目中的集成方式

```typescript
// lib/sources/twitter.ts

// 搜索推文
async function searchTweets(keyword: string, limit = 20): Promise<TrendItem[]>

// 获取趋势话题
async function fetchTwitterTrends(): Promise<TrendItem[]>
```

### 评分算法

```typescript
// 推文评分：likes×1 + retweets×3 + replies×0.5 + 万次浏览奖励20分
function calculateTweetScore(tweet): number  // 归一化到 0-100

// 趋势评分：排名位置 + 推文量，对数缩放
function calculateTrendScore(trend): number  // 归一化到 0-100
```

### 缓存策略

- 5 分钟内存缓存，按查询关键词为 key
- 避免短时间内重复请求同一关键词

---

## 3. 数据源 — 网页搜索爬虫

> 爬取 Bing、DuckDuckGo、TechCrunch 的搜索结果

### 基本信息

| 项目 | 值 |
|------|-----|
| **方式** | 后端 `fetch` + `cheerio` HTML 解析 |
| **依赖** | `cheerio@^1.2.0` |
| **无需 API Key** | 直接爬取网页 |

### 数据源详情

| 来源 | URL | 说明 |
|------|-----|------|
| **Bing 搜索** | `bing.com/search?q=<keyword>` | 支持时间范围过滤 (`day`/`week`/`month`) |
| **DuckDuckGo** | `html.duckduckgo.com/html/` | HTML 版本，提取实际 URL |
| **TechCrunch AI** | `techcrunch.com/category/artificial-intelligence/` | AI 领域专业源 |

### 项目中的集成方式

```typescript
// lib/sources/web-search.ts

// 网页搜索（Bing + DuckDuckGo 并行，去重合并）
async function webSearch(keyword: string, limit?: number, fresh?: string): Promise<TrendItem[]>

// AI 趋势搜索（额外包含 TechCrunch）
async function fetchAITrends(limit?: number): Promise<TrendItem[]>
```

### 反爬策略

- 3 个 User-Agent 轮换
- 5 分钟内存缓存
- 评分范围 40-95（带随机扰动）

### 聚合逻辑

```
Bing + DuckDuckGo 并行请求
  → 按标题前30字符去重
  → 按评分降序排序
  → 返回合并结果
```

---

## 4. 通知服务 — Resend 邮件

> 邮件通知（可选），未配置时仅使用浏览器通知

### 基本信息

| 项目 | 值 |
|------|-----|
| **平台** | https://resend.com |
| **SDK** | `resend@^6.12.4` |
| **环境变量** | `RESEND_API_KEY`（可选）、`NOTIFY_EMAIL`（可选） |
| **发件人** | `onboarding@resend.dev` |

### 项目中的集成方式

```typescript
// lib/notify.ts

// 发送每日摘要邮件（暗色主题 HTML）
async function sendDigestEmail(to: string, trends: TrendItem[], summary: string): Promise<void>

// 发送关键词匹配通知邮件
async function sendMatchNotificationEmail(to: string, keyword: string, trend: TrendItem): Promise<void>
```

### 双通道通知

| 通道 | 触发条件 | 前置要求 |
|------|---------|---------|
| **浏览器通知** | 关键词匹配到热点 | 用户授权 Notification 权限 |
| **邮件通知** | 同上 | 配置 `RESEND_API_KEY` + `NOTIFY_EMAIL` |

---

## 5. 内部 API 路由

> Next.js App Router API Routes

### 热点数据

| 路由 | 方法 | 说明 | 参数 |
|------|------|------|------|
| `/api/trends` | GET | 聚合所有数据源 | `q`, `sources`, `limit` |
| `/api/search` | GET | 网页搜索 | `q`, `limit`, `fresh` |
| `/api/twitter` | GET | Twitter 数据 | `q`, `limit`, `type` (search/trends) |

#### `/api/trends` 响应示例

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "GPT-5 正式发布",
      "url": "https://...",
      "description": "...",
      "score": 92,
      "source": "web-search",
      "sourceLabel": "Bing 搜索",
      "tags": ["AI", "GPT"],
      "isFake": false,
      "matchedKeywords": ["GPT"]
    }
  ],
  "meta": { "total": 30, "sources": ["web-search", "twitter"] }
}
```

### AI 功能

| 路由 | 方法 | 说明 | 请求体 |
|------|------|------|--------|
| `/api/ai/match` | POST | 关键词匹配 | `{ title, description, keywords }` |
| `/api/ai/detect` | POST | 假内容检测 | `{ title, description, url }` |
| `/api/ai/summarize` | POST | 热点摘要 | `{ trends: TrendItem[] }` |

#### `/api/ai/match` 请求/响应

```json
// 请求
{ "title": "GPT-5 发布", "description": "...", "keywords": ["GPT"] }

// 响应
{ "matched": true, "confidence": 0.95, "reason": "GPT-5 属于 GPT 系列产品" }
```

### 通知

| 路由 | 方法 | 说明 | 请求体 |
|------|------|------|--------|
| `/api/notify` | POST | 发送通知 | `{ type, to, keyword, trend, trends, summary }` |

---

## 6. Agent Skills API

> MCP 兼容的 AI Agent 调用接口

| 路由 | 方法 | 说明 | 必填参数 |
|------|------|------|---------|
| `/api/skills/discover` | POST | 发现热点 | `scope` |
| `/api/skills/monitor` | POST | 监控关键词 | `keywords[]` |
| `/api/skills/summarize` | POST | 生成摘要 | `trends[]` |

详细文档见 [agent-skills.md](agent-skills.md)

---

## 环境变量汇总

| 变量名 | 必填 | 说明 | 获取地址 |
|--------|------|------|---------|
| `ACEDATA_API_KEY` | ✅ | Acedata AI 服务 | https://platform.acedata.cloud |
| `TWITTER_API_KEY` | ✅ | Twitter API | https://twitterapi.io |
| `RESEND_API_KEY` | ❌ | 邮件通知 | https://resend.com |
| `NOTIFY_EMAIL` | ❌ | 通知邮箱 | — |
