// POST /api/ai/match-batch - 批量关键词语义匹配（仅用于展示，不触发通知）
import { NextRequest, NextResponse } from 'next/server';
import { matchKeywordsBatch } from '@/lib/ai';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { trends, keywords } = body;

    if (!trends || !Array.isArray(trends) || trends.length === 0) {
      return NextResponse.json(
        { success: false, error: '参数缺失：需要 trends 数组' },
        { status: 400 }
      );
    }

    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return NextResponse.json(
        { success: false, error: '参数缺失：需要 keywords 数组' },
        { status: 400 }
      );
    }

    const batchResults = await matchKeywordsBatch(trends, keywords);
    const result: Record<string, { matched: boolean; confidence: number; reason: string }> = {};
    batchResults.forEach((value, key) => {
      result[key] = value;
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('AI match batch error:', error);
    return NextResponse.json(
      { success: false, error: 'AI批量匹配失败' },
      { status: 500 }
    );
  }
}
