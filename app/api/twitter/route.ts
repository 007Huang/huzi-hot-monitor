// GET /api/twitter - Twitter 数据
import { NextRequest, NextResponse } from 'next/server';
import { searchTweets, fetchTwitterTrends } from '@/lib/sources/twitter';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') || '10');
    const type = searchParams.get('type') || 'search'; // 'search' | 'trends'

    let results;

    if (type === 'trends') {
      results = await fetchTwitterTrends(Math.min(limit, 50));
    } else {
      results = await searchTweets({
        keyword: keyword || 'AI',
        limit: Math.min(limit, 50),
      });
    }

    return NextResponse.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error('Twitter API error:', error);
    return NextResponse.json(
      { success: false, error: '获取Twitter数据失败' },
      { status: 500 }
    );
  }
}
