// POST /api/ai/expand-keywords - 关键词语义扩展（Query Expansion）
import { NextRequest, NextResponse } from 'next/server';
import { expandKeywords } from '@/lib/query-expansion';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { keywords } = body;

    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return NextResponse.json(
        { success: false, error: '参数缺失：需要 keywords 数组' },
        { status: 400 }
      );
    }

    const expanded = await expandKeywords(keywords);
    const result: Record<string, string[]> = {};
    expanded.forEach((value, key) => {
      result[key] = value;
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Expand keywords error:', error);
    return NextResponse.json(
      { success: false, error: '关键词扩展失败' },
      { status: 500 }
    );
  }
}
