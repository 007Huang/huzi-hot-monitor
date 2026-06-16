# 🔥 Hot Monitor - Agent Skills 文档

## 概述

Hot Monitor 提供了 3 个 Agent Skill API，可供其他 AI Agent 调用，实现热点发现、关键词监控和摘要生成。

## API 端点

### 1. 发现热点 `POST /api/skills/discover`

发现指定范围内的热点话题。

**请求体**：
```json
{
  "scope": "AI编程",          // 必填：搜索范围/关键词
  "limit": 20,                // 可选：返回数量，默认20
  "sources": ["web-search", "twitter"],  // 可选：数据源
  "includeSummary": true      // 可选：是否包含AI摘要，默认true
}
```

**响应**：
```json
{
  "success": true,
  "data": {
    "trends": [
      {
        "id": "bing-xxx",
        "title": "GPT-5 发布...",
        "url": "https://...",
        "description": "...",
        "score": 85,
        "source": "web-search",
        "sourceLabel": "Bing 搜索",
        "tags": ["AI", "GPT"],
        "createdAt": "2026-06-16T...",
        "fetchedAt": "2026-06-16T..."
      }
    ],
    "summary": {
      "summary": "1. GPT-5正式发布...",
      "topTopics": ["GPT-5", "AI", "OpenAI"]
    },
    "meta": {
      "scope": "AI编程",
      "sources": ["web-search", "twitter"],
      "total": 18,
      "fetchedAt": "2026-06-16T..."
    }
  }
}
```

---

### 2. 监控关键词 `POST /api/skills/monitor`

检查关键词是否有新的匹配内容，并自动进行AI验真。

**请求体**：
```json
{
  "keywords": ["GPT-5", "Claude 4"],    // 必填：监控关键词数组
  "sources": ["web-search", "twitter"],  // 可选：数据源
  "checkFake": true,                     // 可选：是否检测假内容，默认true
  "excludeIds": ["twitter-123"]          // 可选：已通知的ID，避免重复
}
```

**响应**：
```json
{
  "success": true,
  "data": {
    "matched": [
      {
        "id": "bing-xxx",
        "title": "GPT-5正式发布",
        "matchedKeywords": ["GPT-5"],
        "isFake": false,
        ...
      }
    ],
    "newItems": [...],        // 真实的新匹配项
    "fakeItems": [...],       // 疑似虚假的匹配项
    "totalChecked": 25,
    "totalMatched": 3,
    "checkedAt": "2026-06-16T..."
  }
}
```

---

### 3. 生成摘要 `POST /api/skills/summarize`

对给定热点列表生成AI摘要。

**请求体**：
```json
{
  "trends": [                // 必填：热点数组
    {
      "title": "GPT-5发布",
      "description": "...",
      "score": 85,
      "sourceLabel": "Bing 搜索"
    }
  ],
  "language": "zh"           // 可选：语言，默认zh
}
```

**响应**：
```json
{
  "success": true,
  "data": {
    "summary": "1. GPT-5正式发布，性能大幅提升...",
    "topTopics": ["GPT-5", "AI"],
    "language": "zh",
    "generatedAt": "2026-06-16T..."
  }
}
```

---

## MCP Server 配置

将以下配置添加到 AI Agent 的 MCP 配置中：

```json
{
  "mcpServers": {
    "hot-monitor": {
      "url": "https://your-domain.com/api/skills",
      "description": "Hot Monitor 热点监控技能 - 发现热点、监控关键词、生成摘要"
    }
  }
}
```

## 调用示例

### curl
```bash
# 发现AI编程热点
curl -X POST http://localhost:3000/api/skills/discover \
  -H "Content-Type: application/json" \
  -d '{"scope": "AI编程", "limit": 10}'

# 监控GPT-5关键词
curl -X POST http://localhost:3000/api/skills/monitor \
  -H "Content-Type: application/json" \
  -d '{"keywords": ["GPT-5", "Claude 4"]}'

# 生成摘要
curl -X POST http://localhost:3000/api/skills/summarize \
  -H "Content-Type: application/json" \
  -d '{"trends": [{"title": "GPT-5发布", "score": 90, "sourceLabel": "Bing"}]}'
```
