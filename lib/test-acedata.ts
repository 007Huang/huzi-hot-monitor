/**
 * Acedata.cloud API 兼容性测试
 *
 * 文档：https://platform.acedata.cloud/documents/aichat2-conversations-integration
 * Endpoint: POST https://api.acedata.cloud/aichat2/conversations
 *
 * 请求格式（与标准 OpenAI 不同）：
 *   { model, question }  而非 { model, messages }
 * 响应格式：
 *   { answer: string, id: string }  而非 { choices: [...] }
 *
 * 测试 deepseek-v4-flash / gpt-5.4 / claude-opus-4-8
 *
 * 使用方法：
 *   1. 在 .env.local 中添加 ACEDATA_API_KEY=your_key_here
 *   2. 运行: npx tsx lib/test-acedata.ts
 */

// ===== 配置 =====
const ACEDATA_BASE_URL = 'https://api.acedata.cloud/aichat2/conversations';
// const ACEDATA_API_KEY = process.env.ACEDATA_API_KEY || '';
const ACEDATA_API_KEY = process.env.ACEDATA_API_KEY || '8a462f67007847f8badcf5bfd5e7885c';

// 待测试的模型
const MODELS_TO_TEST = [
  { id: 'deepseek-v4-flash',    label: 'DeepSeek V4 Flash' },
  { id: 'gpt-5.4',              label: 'GPT-5.4' },
  { id: 'claude-opus-4-8',      label: 'Claude Opus 4.8' },
];

// ===== 类型定义 =====
interface AcedataResponse {
  answer: string;
  id: string;
}

interface AcedataError {
  error?: { message?: string; code?: string };
  message?: string;
}

if (!ACEDATA_API_KEY) {
  console.error('❌ 请设置 ACEDATA_API_KEY 环境变量');
  console.error('   export ACEDATA_API_KEY=your_key_here');
  // 测试用内联 key
  // process.exit(1);
}

/**
 * 调用 Acedata aichat2 API
 *
 * 注意：这个 API 不是标准的 OpenAI 格式！
 * 请求用 { model, question } 而非 { model, messages }
 * 返回 { answer, id } 而非 { choices: [...] }
 */
async function callAcedata(
  model: string,
  question: string,
): Promise<string> {
  const response = await fetch(ACEDATA_BASE_URL, {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'Authorization': `Bearer ${ACEDATA_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      question,
    }),
  });

  if (!response.ok) {
    const errorBody: AcedataError = await response.json().catch(() => ({}));
    const errMsg = errorBody?.error?.message || errorBody?.message || '(no body)';
    throw new Error(`HTTP ${response.status}: ${errMsg}`);
  }

  const data: AcedataResponse = await response.json();
  return data.answer || '(空响应)';
}

async function testModel(modelId: string, label: string): Promise<void> {
  process.stdout.write(`\n🔍 测试 [${label}] (${modelId})... `);

  try {
    const start = Date.now();
    const answer = await callAcedata(
      modelId,
      '用一句话介绍你自己，包括你的模型名称。',
    );

    const elapsed = ((Date.now() - start) / 1000).toFixed(1);

    console.log(`✅ ${elapsed}s`);
    console.log(`   └─ ${answer.slice(0, 150)}`);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    const code = msg.includes('401') ? '401 Unauthorized' :
                 msg.includes('402') ? '402 Payment Required' :
                 msg.includes('404') ? '404 Not Found' :
                 msg.includes('429') ? '429 Rate Limited' :
                 msg.includes('timeout') ? 'Timeout' : 'Error';
    console.log(`❌ ${code}`);
    console.log(`   └─ ${msg.slice(0, 180)}`);
  }
}

async function main() {
  console.log('═'.repeat(50));
  console.log('  Acedata.cloud API 兼容性测试');
  console.log(`  Base URL: ${ACEDATA_BASE_URL}`);
  console.log(`  API Key:  ${ACEDATA_API_KEY.slice(0, 8)}...${ACEDATA_API_KEY.slice(-4)}`);
  console.log('═'.repeat(50));

  for (const model of MODELS_TO_TEST) {
    await testModel(model.id, model.label);
  }

  console.log('\n' + '═'.repeat(50));
  console.log('  测试完成');
  console.log('  记下通过的模型 ID，用于修改 lib/ai.ts');
  console.log('═'.repeat(50));
}

main().catch(console.error);