// OpenRouter AI 集成 - 使用 OpenAI SDK，自动选择可用模型
import OpenAI from 'openai';
import type { MatchResult, FakeDetectResult, SummarizeResult, TrendItem } from '@/types';

const client = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    'HTTP-Referer': 'https://huzi-hot-monitor.app',
    'X-OpenRouter-Title': 'Hot Monitor',
  },
});

// 模型优先级列表：免费模型优先，付费模型作为后备
const MODEL_FALLBACKS = [
  'google/gemma-4-31b-it:free',      // 免费，31B参数，质量不错
  'nvidia/nemotron-3-super-120b-a12b:free', // 免费，120B MoE
  'deepseek/deepseek-chat',           // 付费，便宜好用
];

// 缓存当前可用的模型
let workingModel: string | null = null;

/**
 * 通用 AI 调用方法（带模型自动降级）
 */
async function callAI(systemPrompt: string, userPrompt: string, maxTokens = 500): Promise<string> {
  // 如果已知可用模型，直接使用
  const modelsToTry = workingModel
    ? [workingModel, ...MODEL_FALLBACKS.filter(m => m !== workingModel)]
    : MODEL_FALLBACKS;

  for (const model of modelsToTry) {
    try {
      const completion = await client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: maxTokens,
      });

      const content = completion.choices[0]?.message?.content || '';
      if (content) {
        workingModel = model; // 缓存可用模型
        return content;
      }
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.warn(`Model ${model} failed: ${errMsg.slice(0, 100)}`);

      // 402/401 说明余额不足或认证失败，跳过此模型
      if (errMsg.includes('402') || errMsg.includes('401') || errMsg.includes('Insufficient')) {
        continue;
      }
      // 其他错误（网络等）也跳过
      continue;
    }
  }

  throw new Error('所有AI模型均不可用，请检查 OPENROUTER_API_KEY 配置或账户余额');
}

/**
 * 关键词匹配 - 判断热点内容是否真正匹配用户监控的关键词
 */
export async function matchKeywords(
  trendTitle: string,
  trendDescription: string,
  keywords: string[]
): Promise<MatchResult> {
  if (keywords.length === 0) {
    return { matched: false, confidence: 0, reason: '没有监控关键词' };
  }

  const systemPrompt = `你是一个热点内容分析专家。判断给定的热点内容是否真正与用户监控的关键词相关。

要求：
1. 不要仅靠关键词字符串匹配，要理解语义
2. "GPT" 应匹配 "GPT-5发布" 但不应匹配 "GPT格式化硬盘"
3. "Claude" 应匹配 "Claude 4发布" 但不应匹配 "Claude Monet的画展"
4. 考虑上下文，技术领域的关键词应在技术语境下匹配

返回 JSON 格式：
{
  "matched": boolean,
  "confidence": number (0-1),
  "reason": string (简短说明匹配/不匹配原因)
}

只返回 JSON，不要其他内容。`;

  const userPrompt = `热点标题：${trendTitle}
热点描述：${trendDescription || '无'}
监控关键词：${keywords.join(', ')}`;

  try {
    const result = await callAI(systemPrompt, userPrompt, 200);
    const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned) as MatchResult;
  } catch (error) {
    console.error('Match keywords error:', error);
    // 降级：简单的字符串匹配
    const matched = keywords.some(kw =>
      trendTitle.toLowerCase().includes(kw.toLowerCase())
    );
    return { matched, confidence: 0.3, reason: 'AI匹配失败，使用字符串匹配降级' };
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
