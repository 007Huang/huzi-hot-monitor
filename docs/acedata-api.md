# Acedata.cloud aichat2 API 对接文档

> AI Chat 对话接口，提供 DeepSeek、GPT、Claude 等多模型接入
> 文档来源：https://platform.acedata.cloud/documents/aichat2-conversations-integration

---

## 基本信息

| 项目 | 值 |
|------|-----|
| **Base URL** | `https://api.acedata.cloud` |
| **Endpoint** | `POST /aichat2/conversations` |
| **认证方式** | `Authorization: Bearer <API_KEY>` |
| **Content-Type** | `application/json` |
| **Accept** | `application/json` |

---

## 请求格式

### 请求地址

```
POST https://api.acedata.cloud/aichat2/conversations
```

### 请求头

```json
{
  "accept": "application/json",
  "authorization": "Bearer sk-your-api-key-here",
  "content-type": "application/json"
}
```

### 请求体

```json
{
  "model": "gpt-5.4",
  "question": "你的问题内容"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `model` | string | 是 | 模型标识，见下方模型列表 |
| `question` | string | 是 | 发送给 AI 的问题文本 |

> **注意**：此 API **非标准 OpenAI 格式**，请求体使用 `{ model, question }` 而非 `{ model, messages }`。

---

## 响应格式

### 成功响应

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

> **注意**：响应体使用 `{ answer, id }` 而非标准 OpenAI 的 `{ choices: [...] }`。

### 错误响应

```json
{
  "error": {
    "message": "The token is invalid, please make sure your token is correct.",
    "code": "invalid_token"
  },
  "trace_id": "af4b13e2-4f87-44dd-9bcd-2c15638634e3"
}
```

常见错误码：

| HTTP 状态码 | 说明 |
|-------------|------|
| 401 | API Key 无效或格式错误 |
| 402 | 账户余额不足（Payment Required） |
| 429 | 请求频率过高（Rate Limited） |

---

## 可用模型

以下模型经实测可用（2025-06）：

| 模型标识 | 说明 | 平均响应时间 |
|----------|------|-------------|
| `deepseek-v4-flash` | DeepSeek V4 Flash，性价比高 | ~4.0s |
| `gpt-5.4` | GPT-5.4，响应最快 | ~2.3s |
| `claude-opus-4-8` | Claude Opus 4.8，质量最高 | ~4.3s |

---

## 调用示例

### cURL

```bash
curl -s "https://api.acedata.cloud/aichat2/conversations" \
  -H "accept: application/json" \
  -H "authorization: Bearer sk-your-api-key-here" \
  -H "content-type: application/json" \
  -X POST \
  -d '{
    "model": "gpt-5.4",
    "question": "用一句话介绍下 AceDataCloud。"
  }'
```

### Python (requests)

```python
import requests

url = "https://api.acedata.cloud/aichat2/conversations"

headers = {
    "accept": "application/json",
    "authorization": "Bearer sk-your-api-key-here",
    "content-type": "application/json",
}

payload = {
    "model": "gpt-5.4",
    "question": "用一句话介绍下 AceDataCloud。",
}

response = requests.post(url, json=payload, headers=headers)
print(response.json())
```

### TypeScript (fetch)

```typescript
const response = await fetch('https://api.acedata.cloud/aichat2/conversations', {
  method: 'POST',
  headers: {
    'accept': 'application/json',
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'gpt-5.4',
    question: '用一句话介绍下 AceDataCloud。',
  }),
});

const data = await response.json();
console.log(data.answer); // AI 的回答
```

---

## 最佳实践

### 1. 模型降级策略

建议配置多个模型按优先级尝试，当高优先级模型不可用时自动降级：

```typescript
const MODELS = ['gpt-5.4', 'deepseek-v4-flash', 'claude-opus-4-8'];

async function callWithFallback(question: string): Promise<string> {
  for (const model of MODELS) {
    try {
      const res = await fetch('https://api.acedata.cloud/aichat2/conversations', {
        method: 'POST',
        headers: { /* ... */ },
        body: JSON.stringify({ model, question }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.answer) return data.answer;
    } catch (e) {
      console.warn(`Model ${model} failed:`, e);
      continue; // 尝试下一个模型
    }
  }
  throw new Error('所有模型均不可用');
}
```

### 2. 缓存可用模型

将成功调通的模型 ID 缓存下来，下次优先使用，减少重复尝试：

```typescript
let workingModel: string | null = null;

async function callAI(question: string): Promise<string> {
  const modelsToTry = workingModel
    ? [workingModel, ...MODELS.filter(m => m !== workingModel)]
    : MODELS;

  for (const model of modelsToTry) {
    // ... 调用逻辑
    if (data.answer) {
      workingModel = model; // 缓存
      return data.answer;
    }
  }
}
```

### 3. 环境变量

```bash
# .env.local
ACEDATA_API_KEY=sk-your-api-key-here
```

---

## 与标准 OpenAI API 差异对比

| 维度 | 标准 OpenAI API | Acedata aichat2 API |
|------|----------------|-------------------|
| **请求体** | `{ model, messages }` | `{ model, question }` |
| **消息格式** | `messages: [{ role, content }]` | 单条 `question` 字符串 |
| **响应体** | `choices[0].message.content` | `answer` |
| **对话 ID** | `id` 在顶层 | `id` 在顶层 |
| **系统提示** | 通过 `role: system` 的消息 | 拼入 `question` 字符串 |
| **流式响应** | SSE (`text/event-stream`) | 未验证 |

> **提示**：需要系统提示时，将其与用户问题拼接为一条 `question` 字符串发送。