// POST /api/ai/summarize - 热点摘要
import { NextRequest, NextResponse } from 'next/server';
import { summarizeTrends } from '@/lib/ai';
import type { TrendItem } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { trends } = body as { trends: TrendItem[] };

    if (!trends || !Array.isArray(trends) || trends.length === 0) {
      return NextResponse.json(
        { success: false, error: '参数缺失：需要非空的 trends 数组' },
        { status: 400 }
      );
    }

    const result = await summarizeTrends(trends);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('AI summarize error:', error);
    return NextResponse.json(
      { success: false, error: 'AI摘要失败' },
      { status: 500 }
    );
  }
}
