// POST /api/ai/match - 关键词匹配
import { NextRequest, NextResponse } from 'next/server';
import { matchKeywords } from '@/lib/ai';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, keywords } = body;

    if (!title || !keywords || !Array.isArray(keywords)) {
      return NextResponse.json(
        { success: false, error: '参数缺失：需要 title 和 keywords' },
        { status: 400 }
      );
    }

    const result = await matchKeywords(title, description || '', keywords);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('AI match error:', error);
    return NextResponse.json(
      { success: false, error: 'AI匹配失败' },
      { status: 500 }
    );
  }
}
