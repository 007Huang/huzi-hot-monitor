// POST /api/notify - 发送通知
import { NextRequest, NextResponse } from 'next/server';
import { sendDigestEmail, sendMatchNotificationEmail } from '@/lib/notify';
import type { TrendItem } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, to, keyword, trend, trends, summary } = body;

    const notifyEmail = process.env.NOTIFY_EMAIL || to;
    if (!notifyEmail) {
      return NextResponse.json(
        { success: false, error: '未配置通知邮箱' },
        { status: 400 }
      );
    }

    let result;

    if (type === 'digest') {
      // 每日摘要邮件
      result = await sendDigestEmail(
        notifyEmail,
        (trends || []) as TrendItem[],
        summary || '暂无摘要'
      );
    } else if (type === 'match') {
      // 关键词匹配通知邮件
      result = await sendMatchNotificationEmail(
        notifyEmail,
        keyword || '',
        trend as TrendItem
      );
    } else {
      return NextResponse.json(
        { success: false, error: '未知通知类型，支持 digest 或 match' },
        { status: 400 }
      );
    }

    if (result.success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Notify API error:', error);
    return NextResponse.json(
      { success: false, error: '通知发送失败' },
      { status: 500 }
    );
  }
}
