// POST /api/skills/summarize - Agent Skill: 生成热点摘要
// 供其他 AI 调用，对给定热点列表生成摘要
import { NextRequest, NextResponse } from 'next/server';
import { summarizeTrends } from '@/lib/ai';
import type { TrendItem } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { trends, language = 'zh' } = body;

    if (!trends || !Array.isArray(trends) || trends.length === 0) {
      return NextResponse.json(
        { success: false, error: '参数缺失：需要非空的 trends 数组' },
        { status: 400 }
      );
    }

    const result = await summarizeTrends(trends as TrendItem[]);

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        language,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Skills summarize error:', error);
    return NextResponse.json(
      { success: false, error: '摘要生成失败' },
      { status: 500 }
    );
  }
}
