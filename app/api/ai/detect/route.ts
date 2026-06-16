// POST /api/ai/detect - 假内容检测
import { NextRequest, NextResponse } from 'next/server';
import { detectFake } from '@/lib/ai';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, url } = body;

    if (!title) {
      return NextResponse.json(
        { success: false, error: '参数缺失：需要 title' },
        { status: 400 }
      );
    }

    const result = await detectFake(title, description || '', url || '');

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('AI detect error:', error);
    return NextResponse.json(
      { success: false, error: 'AI检测失败' },
      { status: 500 }
    );
  }
}
