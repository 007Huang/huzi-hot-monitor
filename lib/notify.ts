// 通知工具 - 浏览器通知 + Resend 邮件
import { Resend } from 'resend';
import type { TrendItem } from '@/types';

// ===== 浏览器通知 =====

/**
 * 请求浏览器通知权限
 */
export function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (!('Notification' in window)) return Promise.resolve(false);

  return Notification.requestPermission().then(permission => permission === 'granted');
}

/**
 * 发送浏览器通知
 */
export function sendBrowserNotification(
  title: string,
  body: string,
  url?: string,
  tag?: string
): void {
  if (typeof window === 'undefined') return;
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const notification = new Notification(title, {
    body,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag, // 相同 tag 的通知会替换，避免堆积
  });

  notification.onclick = () => {
    window.focus();
    if (url) window.open(url);
    notification.close();
  };
}

// ===== Resend 邮件通知 =====

/**
 * 发送每日热点摘要邮件（后端专用）
 */
export async function sendDigestEmail(
  to: string,
  trends: TrendItem[],
  summary: string
): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { success: false, error: 'RESEND_API_KEY 未配置' };
  }

  const resend = new Resend(apiKey);

  try {
    const html = generateDigestHTML(trends, summary);

    const { error } = await resend.emails.send({
      from: 'Hot Monitor <onboarding@resend.dev>',
      to: [to],
      subject: `🔥 Hot Monitor 热点摘要 - ${new Date().toLocaleDateString('zh-CN')}`,
      html,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * 发送关键词匹配通知邮件（后端专用）
 */
export async function sendMatchNotificationEmail(
  to: string,
  keyword: string,
  trend: TrendItem
): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { success: false, error: 'RESEND_API_KEY 未配置' };
  }

  const resend = new Resend(apiKey);

  try {
    const html = `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #0f172a; color: #f8fafc; border-radius: 12px;">
        <h2 style="color: #f59e0b;">🔥 关键词匹配通知</h2>
        <p>你监控的关键词 <strong style="color: #06b6d4;">"${keyword}"</strong> 匹配到新热点：</p>
        <div style="padding: 16px; background: #1e293b; border-radius: 8px; border: 1px solid #334155;">
          <h3 style="margin: 0 0 8px; color: #f59e0b;">${trend.title}</h3>
          <p style="color: #94a3b8; font-size: 14px;">${trend.description || '无描述'}</p>
          <p style="color: #64748b; font-size: 12px;">来源: ${trend.sourceLabel} · 热度: ${trend.score}</p>
          ${trend.isFake ? '<p style="color: #ef4444; font-weight: bold;">⚠️ AI检测：疑似虚假内容</p>' : ''}
        </div>
        <a href="${trend.url}" style="display: inline-block; margin-top: 16px; padding: 8px 16px; background: #f59e0b; color: #0f172a; border-radius: 6px; text-decoration: none; font-weight: bold;">查看原文 →</a>
      </div>
    `;

    const { error } = await resend.emails.send({
      from: 'Hot Monitor <onboarding@resend.dev>',
      to: [to],
      subject: `🎯 关键词 "${keyword}" 匹配到新热点`,
      html,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * 生成摘要邮件 HTML
 */
function generateDigestHTML(trends: TrendItem[], summary: string): string {
  const trendItems = trends.slice(0, 15).map((t, i) => `
    <div style="padding: 12px 0; ${i < trends.length - 1 ? 'border-bottom: 1px solid #334155;' : ''}">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
        <span style="color: #f59e0b; font-weight: bold; font-size: 14px;">#${i + 1}</span>
        <a href="${t.url}" style="color: #f8fafc; text-decoration: none; font-weight: 500;">${t.title}</a>
      </div>
      <div style="color: #64748b; font-size: 12px; padding-left: 24px;">
        来源: ${t.sourceLabel} · 热度: ${t.score}${t.isFake ? ' · ⚠️ 疑似虚假' : ''}
      </div>
    </div>
  `).join('');

  return `
    <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #0f172a; color: #f8fafc; border-radius: 12px;">
      <h1 style="color: #f59e0b; font-size: 22px; margin-bottom: 4px;">🔥 Hot Monitor 热点摘要</h1>
      <p style="color: #64748b; font-size: 13px; margin-bottom: 16px;">${new Date().toLocaleDateString('zh-CN')} · 自动生成</p>

      <div style="padding: 16px; background: #1e293b; border-radius: 8px; border: 1px solid #334155; margin-bottom: 20px;">
        <h3 style="color: #06b6d4; margin: 0 0 8px;">🤖 AI 摘要</h3>
        <p style="white-space: pre-line; font-size: 14px; line-height: 1.6;">${summary}</p>
      </div>

      <h3 style="color: #f59e0b; margin-bottom: 8px;">📋 热点列表</h3>
      ${trendItems}
    </div>
  `;
}
