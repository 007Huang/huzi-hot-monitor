/**
 * AI 匹配优化验证测试
 *
 * 验证以下核心改动的正确性：
 * 1. Query Expansion（查询扩展）：关键词是否能正确扩展为语义变体
 * 2. 严格 AI 匹配：是否能正确区分显式匹配/语义匹配/不匹配
 * 3. 批量匹配：批量场景下是否同样准确
 *
 * 测试数据：
 *   关键词 "Claude Sonnet 4.6"
 *   - 正面用例：内容明确讨论 Claude 4.6 → 期望 matched=true, relationType="explicit"
 *   - 正面用例：讨论 Anthropic 最新模型但未提 Claude → 期望 matched=true, relationType="semantic"
 *   - 负面用例：讨论 OpenClaw 游戏 → 期望 matched=false, relationType="unrelated"
 *   - 负面用例：Claude Monet 画展 → 期望 matched=false, relationType="unrelated"
 *
 * 使用方法：
 *   1. 确保 .env.local 中有 ACEDATA_API_KEY
 *   2. npx tsx -r dotenv/config lib/test-optimization.ts
 *      (或在项目根目录: npx tsx lib/test-optimization.ts)
 */

import { expandKeyword } from './query-expansion';
import { matchKeywords, matchKeywordsBatch } from './ai';

// ===== 辅助：颜色输出 =====
const PASS = '\x1b[32m✅ PASS\x1b[0m';
const FAIL = '\x1b[31m❌ FAIL\x1b[0m';
const INFO = '\x1b[36mℹ️\x1b[0m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string, detail?: string): void {
  if (condition) {
    console.log(`  ${PASS} ${label}`);
    passed++;
  } else {
    console.log(`  ${FAIL} ${label}${detail ? `\n        ${detail}` : ''}`);
    failed++;
  }
}

function section(title: string): void {
  console.log(`\n${BOLD}${'─'.repeat(56)}`);
  console.log(`  ${title}`);
  console.log(`${'─'.repeat(56)}${RESET}`);
}

// ===== 测试用例 =====

interface TestCase {
  keyword: string;
  title: string;
  description: string;
  expectMatch: boolean;
  expectRelationType?: 'explicit' | 'semantic' | 'unrelated';
  label: string;
}

async function testQueryExpansion(): Promise<void> {
  section('1. Query Expansion（查询扩展）');

  // 1a. 中文关键词扩展
  console.log(`  ${INFO} 扩展中文关键词 "鱼皮的AI导航"...`);
  try {
    const variants = await expandKeyword('鱼皮的AI导航');
    console.log(`      结果: [${variants.join(', ')}]`);
    assert(variants.length >= 2, '应返回至少 2 个变体（含原词）');
    assert(variants[0] === '鱼皮的AI导航', '第一个变体应为原始关键词');
    // 应包含语义相近的扩展
    const hasSemanticVariant = variants.some(v =>
      v !== '鱼皮的AI导航' && (v.includes('鱼皮') || v.includes('AI') || v.includes('导航'))
    );
    assert(hasSemanticVariant, '扩展变体应包含语义相关内容');
  } catch (e) {
    console.log(`  ${FAIL} 查询扩展调用失败: ${e instanceof Error ? e.message : e}`);
    failed++;
  }

  // 1b. 英文技术关键词扩展
  console.log(`  ${INFO} 扩展英文关键词 "Claude Sonnet 4.6"...`);
  try {
    const variants = await expandKeyword('Claude Sonnet 4.6');
    console.log(`      结果: [${variants.join(', ')}]`);
    assert(variants.length >= 2, '应返回至少 2 个变体');
    assert(variants[0] === 'Claude Sonnet 4.6', '第一个变体应为原始关键词');
    const hasRelevantVariant = variants.some(v =>
      v.toLowerCase().includes('claude') || v.toLowerCase().includes('anthropic')
    );
    assert(hasRelevantVariant, '变体应包含 Claude 或 Anthropic 相关内容');
  } catch (e) {
    console.log(`  ${FAIL} 查询扩展调用失败: ${e instanceof Error ? e.message : e}`);
    failed++;
  }

  // 1c. 短词不应扩展（跳过 AI 调用）
  console.log(`  ${INFO} 短词 "AI" 应跳过 AI 扩展...`);
  const shortVariants = await expandKeyword('AI');
  assert(shortVariants.length === 1 && shortVariants[0] === 'AI', '短词应直接返回原词');
}

async function testStrictMatching(): Promise<void> {
  section('2. 严格 AI 匹配判定');

  const keyword = 'Claude Sonnet 4.6';
  const testCases: TestCase[] = [
    {
      keyword,
      title: 'Anthropic 发布 Claude 4.6 Sonnet，推理速度提升 200%',
      description: 'Anthropic 今日正式发布 Claude 4.6 Sonnet 版本，在编程和推理能力上有显著提升。',
      expectMatch: true,
      expectRelationType: 'explicit',
      label: '显式匹配：标题直接含 Claude 4.6 Sonnet',
    },
    {
      keyword,
      title: 'Anthropic 发布新一代 Claude 模型，推理能力大幅提升',
      description: 'Anthropic 今日宣布 Claude 系列模型重大更新，新版本在编程和推理能力上全面超越前代。',
      expectMatch: true,
      expectRelationType: 'semantic',
      label: '语义匹配：讨论 Claude 新一代但未提具体版本号',
    },
    {
      keyword,
      title: 'OpenClaw 游戏突破 100 万下载量',
      description: '独立游戏 OpenClaw 在 Steam 平台上架首周即突破百万下载。',
      expectMatch: false,
      expectRelationType: 'unrelated',
      label: '不匹配：仅字符串部分重叠（OpenClaw ≠ Claude）',
    },
    {
      keyword,
      title: '梵高 Claude Monet 画展在巴黎卢浮宫开幕',
      description: '印象派大师 Claude Monet 的经典作品在巴黎展出。',
      expectMatch: false,
      expectRelationType: 'unrelated',
      label: '不匹配：同名字段不同义（Monet 画家 ≠ AI 产品）',
    },
  ];

  for (const tc of testCases) {
    console.log(`  ${INFO} ${tc.label}`);
    try {
      const result = await matchKeywords(tc.title, tc.description, [tc.keyword]);
      console.log(`      结果: matched=${result.matched}, relationType=${result.relationType}, confidence=${result.confidence}`);
      console.log(`      理由: ${result.reason}`);

      assert(result.matched === tc.expectMatch,
        `匹配判定正确 (期望 ${tc.expectMatch})`,
        `Got matched=${result.matched}, expected ${tc.expectMatch}`,
      );

      if (tc.expectRelationType) {
        assert(result.relationType === tc.expectRelationType,
          `匹配类型为 "${tc.expectRelationType}"`,
          `Got ${result.relationType}, expected ${tc.expectRelationType}`,
        );
      }
    } catch (e) {
      console.log(`  ${FAIL} 测试调用失败: ${e instanceof Error ? e.message : e}`);
      failed++;
    }
  }
}

async function testBatchMatching(): Promise<void> {
  section('3. 批量 AI 匹配判定');

  const keyword = 'GPT-5';
  const trends = [
    { id: '1', title: 'OpenAI 正式发布 GPT-5，多模态能力大幅提升', description: 'GPT-5 支持图像、视频和文本的多模态理解。' },
    { id: '2', title: 'GPT 硬盘格式化工具推荐', description: '推荐几款好用的 GPT 分区格式化软件。' },
    { id: '3', title: 'OpenAI 新一代模型训练细节曝光', description: 'OpenAI CEO 透露新模型的训练计算量是前代的 10 倍。' },
  ];

  console.log(`  ${INFO} 关键词 "${keyword}"，3 条数据（1显式匹配+1字符串陷阱+1语义模糊）`);
  try {
    const results = await matchKeywordsBatch(trends, [keyword]);
    console.log(`      结果: ${JSON.stringify(Object.fromEntries(results), null, 2)}`);

    const r1 = results.get('1');
    assert(r1?.matched === true, 'ID=1 应判定为匹配（显式含 GPT-5）');
    assert(r1?.relationType === 'explicit', 'ID=1 应为显式匹配');

    const r2 = results.get('2');
    assert(r2?.matched === false, 'ID=2 应判定为不匹配（GPT 格式化 ≠ GPT-5）');
    assert(r2?.relationType === 'unrelated', 'ID=2 应为不匹配');

    const r3 = results.get('3');
    assert(r3?.matched === false, 'ID=3 应判定为不匹配（"新模型"语义桥梁模糊，严格策略拒绝）');
  } catch (e) {
    console.log(`  ${FAIL} 批量匹配调用失败: ${e instanceof Error ? e.message : e}`);
    failed++;
  }
}

async function testLocalMatching(): Promise<void> {
  section('4. 扩展词本地子串匹配（模拟）');

  // 模拟 matchKeywordsLocally 的逻辑
  const activeKeywords = [{ keyword: '鱼皮的AI导航', active: true } as any];
  const expandedQueriesMap = {
    '鱼皮的AI导航': ['鱼皮的AI导航', '程序员鱼皮的AI导航', 'AI导航鱼皮', '鱼皮AI编程教程'],
  };

  const trends = [
    { id: 'a', title: '程序员鱼皮的AI导航更新了', description: '内容', matchedKeywords: [] },
    { id: 'b', title: '鱼皮AI编程教程 2026 版', description: '教程', matchedKeywords: [] },
    { id: 'c', title: '今天天气真好', description: '无关内容', matchedKeywords: [] },
  ] as any[];

  function simulateLocalMatch(
    trends: any[],
    keywords: { keyword: string; active: boolean }[],
    expandedMap?: Record<string, string[]>,
  ): any[] {
    return trends.map(trend => {
      const text = `${trend.title} ${trend.description || ''}`.toLowerCase();
      const matched: string[] = [];
      for (const kw of keywords) {
        const kwLower = kw.keyword.toLowerCase();
        if (text.includes(kwLower)) { matched.push(kw.keyword); continue; }
        const variants = expandedMap?.[kw.keyword];
        if (variants) {
          const found = variants.find(v => v.toLowerCase() !== kwLower && text.includes(v.toLowerCase()));
          if (found) { matched.push(kw.keyword); }
        }
      }
      if (matched.length > 0) {
        return { ...trend, matchedKeywords: matched, localMatchReason: `包含「${matched.join('、')}」` };
      }
      return trend;
    });
  }

  const results = simulateLocalMatch(trends, activeKeywords, expandedQueriesMap);

  assert(results[0].matchedKeywords?.length > 0, '扩展词 "程序员鱼皮的AI导航" 应匹配（变体匹配）');
  assert(results[1].matchedKeywords?.length > 0, '扩展词 "鱼皮AI编程教程" 应匹配（变体匹配）');
  assert(!results[2].matchedKeywords?.length, '无关内容不应匹配');
}

async function main() {
  console.log(`${BOLD}${'═'.repeat(56)}`);
  console.log('  AI 匹配优化验证测试');
  console.log(`  ${new Date().toLocaleString()}`);
  console.log(`${'═'.repeat(56)}${RESET}`);

  await testQueryExpansion();
  await testStrictMatching();
  await testBatchMatching();
  await testLocalMatching();

  // 汇总
  const total = passed + failed;
  console.log(`\n${BOLD}${'═'.repeat(56)}`);
  console.log(`  测试完成: ${total} 项`);
  console.log(`  ${PASS} ${passed} 通过`);
  if (failed > 0) {
    console.log(`  ${FAIL} ${failed} 失败`);
  } else {
    console.log(`  ${INFO} 全部通过！`);
  }
  console.log(`${'═'.repeat(56)}${RESET}`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => {
  console.error('测试异常:', e);
  process.exit(1);
});
