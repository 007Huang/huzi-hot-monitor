// POST /api/ai/summarize-items - 批量生成每条热点的简短 AI 摘要
import { NextRequest, NextResponse } from 'next/server';
import { generateItemSummaries } from '@/lib/ai';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { trends } = body;

    if (!trends || !Array.isArray(trends) || trends.length === 0) {
      return NextResponse.json(
        { success: false, error: '参数缺失：需要 trends 数组' },
        { status: 400 }
      );
    }

    const summaries = await generateItemSummaries(trends);
    const result: Record<string, string> = {};
    summaries.forEach((value, key) => { result[key] = value; });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('AI summarize items error:', error);
    return NextResponse.json(
      { success: false, error: 'AI摘要生成失败' },
      { status: 500 }
    );
  }
}
