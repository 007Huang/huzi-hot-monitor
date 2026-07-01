/**
 * Acedata.cloud AI 集成
 *
 * API 文档：https://platform.acedata.cloud/documents/aichat2-conversations-integration
 * Endpoint: POST https://api.acedata.cloud/aichat2/conversations
 *
 * 注意：此 API 非标准 OpenAI 格式
 *   - 请求: { model, question }  而非 { model, messages }
 *   - 响应: { answer, id }      而非 { choices: [...] }
 */
import type { MatchResult, FakeDetectResult, SummarizeResult, TrendItem } from '@/types';

// ===== API 配置 =====
const ACEDATA_BASE_URL = 'https://api.acedata.cloud/aichat2/conversations';
const ACEDATA_API_KEY = process.env.ACEDATA_API_KEY || '';

// ===== 类型定义 =====
interface AcedataResponse {
  answer: string;
  id: string;
}

// 模型优先级列表：按性价比排序
const MODEL_FALLBACKS = [
  'gpt-5.4-mini',              // gpt-5.4-mini，响应快
   'deepseek-v4-flash',    // DeepSeek V4 Flash，便宜
   
  // 'gpt-5.4',              // GPT-5.4，响应快

  // 'claude-opus-4-8',      // Claude Opus 4.8，质量最高

];

// 缓存当前可用的模型
let workingModel: string | null = null;

/**
 * 通用 AI 调用方法（带模型自动降级）
 */
export async function callAI(systemPrompt: string, userPrompt: string, _maxTokens = 500): Promise<string> {
  // 组合 system + user 为一个完整的问题
  const question = `${systemPrompt}\n\n${userPrompt}`;

  // 如果已知可用模型，优先使用
  const modelsToTry = workingModel
    ? [workingModel, ...MODEL_FALLBACKS.filter(m => m !== workingModel)]
    : MODEL_FALLBACKS;

  for (const model of modelsToTry) {
    try {
      const response = await fetch(ACEDATA_BASE_URL, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'Authorization': `Bearer ${ACEDATA_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model, question }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({})) as Record<string, unknown>;
        const errMsg = ((errorBody as { error?: { message?: string } })?.error?.message
          || (errorBody as { message?: string })?.message
          || `HTTP ${response.status}`) as string;
        throw new Error(errMsg);
      }

      const data: AcedataResponse = await response.json();
      const content = data.answer || '';
      if (content) {
        workingModel = model; // 缓存可用模型
        return content;
      }
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.warn(`Model ${model} failed: ${errMsg.slice(0, 100)}`);

      // 402 余额不足 / 401 认证失败 — 跳过此模型
      if (errMsg.includes('402') || errMsg.includes('401') || errMsg.includes('Insufficient')) {
        continue;
      }
      // 其他错误也跳过
      continue;
    }
  }

  throw new Error('所有AI模型均不可用，请检查 ACEDATA_API_KEY 配置或账户余额');
}

/**
 * 关键词匹配 - 判断热点内容是否真正匹配用户监控的关键词（严格模式）
 *
 * 策略：严格判定，宁缺毋滥。只有内容显式讨论关键词或存在强语义桥梁时才匹配。
 */
export async function matchKeywords(
  trendTitle: string,
  trendDescription: string,
  keywords: string[]
): Promise<MatchResult> {
  if (keywords.length === 0) {
    return { matched: false, confidence: 0, reason: '没有监控关键词' };
  }

  const systemPrompt = `你是一个热点内容相关性判定专家。判断给定的热点内容是否真正与用户监控的关键词相关。

这是一个严格的判定系统，宁缺毋滥。

判定规则（按优先级）：
1. **显式匹配 (explicit)**：内容是直接讨论关键词所指代的对象/产品/人物/概念。例如：
   - 关键词"Claude Sonnet 4.6" → 内容讨论Claude 4.6版本发布、评测、更新 → 显式匹配
   - 关键词"鱼皮的AI导航" → 内容讨论鱼皮的导航网站或相关资源 → 显式匹配
2. **语义匹配 (semantic)**：内容未直接提及关键词，但在讨论强相关的概念。只有在能明确建立语义桥梁时才匹配。例如：
   - 关键词"GPT-5" → 内容讨论"OpenAI的新一代模型"但未提GPT-5 → 可语义匹配（语义桥梁明确）
   - 关键词"Claude" → 内容讨论"Anthropic的最新AI助手"但未提Claude → 可语义匹配
3. **不匹配 (unrelated)**：以下情况一律判定为不匹配：
   - 仅有字符串部分重叠但语义不同（如"OpenClaw"不匹配"Claude"）
   - 模糊的泛化关联（如"AI"与任何AI相关内容都算过度泛化）
   - 同一个词的不同义项（如"Apple"作为水果 vs 公司）
   - 内容提到关键词但只是顺带提及，并非主要内容

返回 JSON 格式：
{
  "matched": boolean,
  "confidence": number (0-1),
  "reason": string (简短说明匹配/不匹配原因),
  "matchedKeywords": string[] (实际匹配到的关键词或空数组),
  "relationType": "explicit" | "semantic" | "unrelated"
}

只返回 JSON，不要其他内容。`;

  const userPrompt = `热点标题：${trendTitle}
热点描述：${trendDescription || '无'}
监控关键词：${keywords.join(', ')}`;

  try {
    const result = await callAI(systemPrompt, userPrompt, 300);
    const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned) as {
      matched: boolean;
      confidence: number;
      reason: string;
      matchedKeywords?: string[];
      relationType?: 'explicit' | 'semantic' | 'unrelated';
    };
    return {
      matched: parsed.matched,
      confidence: parsed.confidence,
      reason: parsed.reason,
      matchedKeywords: parsed.matchedKeywords || (parsed.matched ? [...keywords] : []),
      relationType: parsed.relationType || (parsed.matched ? 'semantic' : 'unrelated'),
    };
  } catch (error) {
    console.error('Match keywords error:', error);
    // 降级：简单的字符串匹配（保守策略）
    const matched = keywords.some(kw =>
      trendTitle.toLowerCase().includes(kw.toLowerCase())
    );
    return {
      matched,
      confidence: matched ? 0.4 : 0.2,
      reason: matched ? 'AI匹配失败，使用字符串匹配降级' : 'AI匹配失败，未找到关键词',
      matchedKeywords: matched ? keywords.filter(kw => trendTitle.toLowerCase().includes(kw.toLowerCase())) : [],
      relationType: matched ? 'explicit' : 'unrelated',
    };
  }
}

/**
 * 批量 AI 关键词语义匹配 — 一次 API 调用评估多个趋势（严格模式）
 * 用于展示 AI 匹配理由（独立于监控通知流程）
 * 返回 Map<trendId, { matched, confidence, reason, matchedKeywords?, relationType? }>
 */
export async function matchKeywordsBatch(
  trends: Array<{ id: string; title: string; description?: string }>,
  keywords: string[]
): Promise<Map<string, MatchResult>> {
  if (trends.length === 0 || keywords.length === 0) return new Map();

  const systemPrompt = `你是一个热点内容相关性判定专家。判断以下每个热点内容是否真正与监控关键词相关。

这是一个严格的判定系统，宁缺毋滥。

判定规则：
1. **显式匹配 (explicit)**：内容直接讨论关键词所指代的对象
2. **语义匹配 (semantic)**：内容未直接提及但讨论强相关概念（需有明确语义桥梁）
3. **不匹配 (unrelated)**：仅有字符串部分重叠但语义不同、模糊关联、顺带提及

每条返回：
{
  "matched": boolean,
  "confidence": number (0-1),
  "reason": string,
  "relationType": "explicit" | "semantic" | "unrelated"
}

返回 JSON 对象，key 为序号 (0-based)，value 为上述结构：
{"0": {"matched": true, "confidence": 0.9, "reason": "简短理由", "relationType": "explicit"}, ...}

只返回 JSON，不要其他内容。`;

  const itemList = trends.map((t, i) =>
    `${i}. 标题：${t.title}\n   描述：${(t.description || '').slice(0, 150)}`
  ).join('\n\n');

  const userPrompt = `监控关键词：${keywords.join(', ')}\n\n${itemList}`;

  try {
    const result = await callAI(systemPrompt, userPrompt, 800);
    const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned) as Record<string, {
      matched: boolean;
      confidence: number;
      reason: string;
      relationType?: 'explicit' | 'semantic' | 'unrelated';
    }>;
    const map = new Map<string, MatchResult>();
    for (const [key, value] of Object.entries(parsed)) {
      const idx = parseInt(key);
      if (!isNaN(idx) && trends[idx]) {
        map.set(trends[idx].id, {
          matched: value.matched,
          confidence: value.confidence,
          reason: value.reason,
          relationType: value.relationType || (value.matched ? 'semantic' : 'unrelated'),
        });
      }
    }
    return map;
  } catch (error) {
    console.error('Match keywords batch error:', error);
    return new Map();
  }
}

/**
 * 假内容检测 - 识别标题党、虚假更新传闻等误导性内容
 */
export async function detectFake(
  trendTitle: string,
  trendDescription: string,
  trendUrl: string
): Promise<FakeDetectResult> {
  const systemPrompt = `你是一个内容真实性判断专家。判断给定的热点内容是否可能是虚假或误导性的。

关注以下信号：
1. 标题党：标题夸大但内容不支撑（如"震惊！""重大突破！"但无实质内容）
2. 虚假传闻：声称某产品发布但无官方来源或引用
3. 翻译错误：中文媒体翻译外文时产生的误读
4. 过时信息：将旧新闻重新包装为新消息
5. 谣言传播：没有可靠来源佐证的爆炸性消息

返回 JSON 格式：
{
  "isFake": boolean,
  "confidence": number (0-1),
  "reason": string (简短说明判断理由)
}

注意：宁可信其有，不可信其无。如果无法确定，倾向于不标记为假内容。
只返回 JSON，不要其他内容。`;

  const userPrompt = `标题：${trendTitle}
描述：${trendDescription || '无'}
来源URL：${trendUrl || '未知'}`;

  try {
    const result = await callAI(systemPrompt, userPrompt, 200);
    const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned) as FakeDetectResult;
  } catch (error) {
    console.error('Detect fake error:', error);
    return { isFake: false, confidence: 0, reason: 'AI检测失败，默认为真实' };
  }
}

/**
 * 热点摘要 - 对热点列表生成简明中文摘要
 */
export async function summarizeTrends(trends: TrendItem[]): Promise<SummarizeResult> {
  if (trends.length === 0) {
    return { summary: '暂无热点数据', topTopics: [] };
  }

  const systemPrompt = `你是一个科技新闻摘要专家。对给定的热点列表生成简明的中文摘要。

要求：
1. 按重要性排序，最热门的排前面
2. 每个热点用1-2句话概括关键信息
3. 合并相同主题的热点
4. 用数字标号列出
5. 最后列出3-5个热门话题关键词

返回 JSON 格式：
{
  "summary": string (摘要文本，每条用数字标号)",
  "topTopics": string[] (3-5个热门话题关键词)
}

只返回 JSON，不要其他内容。`;

  const trendList = trends.slice(0, 15).map((t, i) =>
    `${i + 1}. [${t.sourceLabel}] ${t.title} ${t.description ? `- ${t.description.slice(0, 80)}` : ''}`
  ).join('\n');

  try {
    const result = await callAI(systemPrompt, trendList, 800);
    const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned) as SummarizeResult;
  } catch (error) {
    console.error('Summarize error:', error);
    return {
      summary: trends.slice(0, 5).map((t, i) => `${i + 1}. ${t.title}`).join('\n'),
      topTopics: trends.slice(0, 3).map(t => t.title.slice(0, 15)),
    };
  }
}

/**
 * 提取标签 - 从标题/描述中提取标签
 */
export async function extractTags(title: string, description: string): Promise<string[]> {
  const systemPrompt = `从给定的标题和描述中提取3-5个关键标签。

要求：
1. 标签应简洁，1-3个字
2. 关注技术、产品、公司名
3. 只返回标签数组，如 ["AI", "GPT", "OpenAI"]

只返回 JSON 数组，不要其他内容。`;

  const userPrompt = `标题：${title}\n描述：${description || '无'}`;

  try {
    const result = await callAI(systemPrompt, userPrompt, 100);
    const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned) as string[];
  } catch (error) {
    console.error('Extract tags error:', error);
    return [];
  }
}

/**
 * 批量生成热点摘要 - 对 top N 条趋势每条生成 1-2 句中文摘要
 * 返回 Map<trendId, summary>
 */
export async function generateItemSummaries(
  trends: { id: string; title: string; description?: string }[]
): Promise<Map<string, string>> {
  if (trends.length === 0) return new Map();

  const items = trends.slice(0, 20); // 最多处理 20 条
  const systemPrompt = `为以下每条热点内容生成简短的 1-2 句中文摘要。

要求：
1. 摘要要精炼，提取核心信息
2. 保留关键的人物、公司、产品名称
3. 用简体中文
4. 每条摘要不超过 50 字
5. **明确说明内容与什么具体产品/技术/事件相关**，不要只说泛泛的描述

示例：
- 好的摘要： "Anthropic 发布了 Claude 4.6 Sonnet 新版本，主打更快推理速度"
- 不好的摘要： "发布了新版本，性能有所提升"（未说明什么产品）
- 好的摘要："鱼皮发布了最新的 AI 编程导航工具，收录 200+ AI 工具"
- 不好的摘要："发布了新内容"（未说明具体内容）
- 好的摘要："OpenAI 公布 GPT-5 训练细节，参数量达数万亿"
- 不好的摘要："公布了新模型细节"（未说明什么模型）

返回 JSON 对象，key 为序号 (0-based)，value 为摘要文本：
{"0": "摘要1", "1": "摘要2", ...}

只返回 JSON，不要其他内容。`;

  const itemList = items.map((t, i) =>
    `${i}. [${t.title}] ${t.description || ''}`.slice(0, 200)
  ).join('\n');

  try {
    const result = await callAI(systemPrompt, itemList, 800);
    const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned) as Record<string, string>;
    const map = new Map<string, string>();
    for (const [key, summary] of Object.entries(parsed)) {
      const idx = parseInt(key);
      if (!isNaN(idx) && items[idx]) {
        map.set(items[idx].id, summary);
      }
    }
    return map;
  } catch (error) {
    console.error('Generate item summaries error:', error);
    return new Map();
  }
}