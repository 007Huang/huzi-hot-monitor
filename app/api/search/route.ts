// GET /api/search - 网页搜索爬虫
import { NextRequest, NextResponse } from 'next/server';
import { webSearch } from '@/lib/sources/web-search';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('q') || 'AI';
    const limit = parseInt(searchParams.get('limit') || '20');
    const fresh = searchParams.get('fresh') as 'day' | 'week' | 'month' | null;

    if (!keyword.trim()) {
      return NextResponse.json(
        { success: false, error: '关键词不能为空' },
        { status: 400 }
      );
    }

    const results = await webSearch({
      keyword: keyword.trim(),
      limit: Math.min(limit, 50),
      fresh: fresh || undefined,
    });

    return NextResponse.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { success: false, error: '搜索失败，请稍后重试' },
      { status: 500 }
    );
  }
}
