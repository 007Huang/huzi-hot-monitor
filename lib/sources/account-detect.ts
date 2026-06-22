// 智能账号识别 - 检测关键词是否为社交媒体账号名
import { fetchUserTweets, checkTwitterUser } from './twitter';
import { searchWeiboUser, fetchWeiboUserTimeline } from './weibo';
import type { TrendItem } from '@/types';

export interface AccountDetectionResult {
  isAccount: boolean;
  platform: 'twitter' | 'weibo' | null;
  accountId: string | null;
  accountName: string | null;
}

/**
 * 同步检测：通过 @ 前缀识别账号
 */
export function detectAccount(keyword: string): AccountDetectionResult {
  // @ 前缀明确指定账号
  if (keyword.startsWith('@')) {
    const rest = keyword.slice(1);

    // @weibo:鱼皮 → 微博账号
    if (rest.startsWith('weibo:')) {
      return {
        isAccount: true,
        platform: 'weibo',
        accountId: rest.slice(6),
        accountName: rest.slice(6),
      };
    }

    // @zhihu:xxx → 知乎（暂不支持）
    if (rest.startsWith('zhihu:')) {
      return { isAccount: false, platform: null, accountId: null, accountName: null };
    }

    // 默认 @username → Twitter 账号
    return {
      isAccount: true,
      platform: 'twitter',
      accountId: rest,
      accountName: rest,
    };
  }

  // 无 @ 前缀，不是明确的账号
  return { isAccount: false, platform: null, accountId: null, accountName: null };
}

/**
 * 异步解析：尝试在 Twitter 和微博上搜索该关键词是否匹配到账号
 * 3 秒超时，找不到则返回 null
 */
export async function resolveAccount(keyword: string): Promise<{
  platform: 'twitter' | 'weibo';
  accountId: string;
  accountName: string;
  items: TrendItem[];
} | null> {
  // 先检查 @ 前缀
  const detected = detectAccount(keyword);
  if (detected.isAccount && detected.platform) {
    return fetchAccountContent(detected.platform, detected.accountId!);
  }

  // 自动尝试：并行搜索 Twitter 和微博，3s 超时
  const results = await Promise.allSettled([
    // Twitter: 尝试按用户名查找
    checkTwitterUser(keyword).then(exists => {
      if (exists) return { platform: 'twitter' as const, accountId: keyword, accountName: keyword };
      return null;
    }),
    // 微博: 尝试搜索用户
    searchWeiboUser(keyword).then(user => {
      if (user) return { platform: 'weibo' as const, accountId: user.uid, accountName: user.screenName };
      return null;
    }),
  ]);

  // 取第一个成功的结果
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value) {
      const { platform, accountId, accountName } = result.value;
      return fetchAccountContent(platform, accountId, accountName);
    }
  }

  return null;
}

/**
 * 根据平台获取账号内容
 */
async function fetchAccountContent(
  platform: 'twitter' | 'weibo',
  accountId: string,
  accountName?: string,
): Promise<{
  platform: 'twitter' | 'weibo';
  accountId: string;
  accountName: string;
  items: TrendItem[];
} | null> {
  try {
    if (platform === 'twitter') {
      const items = await fetchUserTweets(accountId, 10);
      if (items.length > 0) {
        return { platform: 'twitter', accountId, accountName: accountName || accountId, items };
      }
    }

    if (platform === 'weibo') {
      const items = await fetchWeiboUserTimeline(accountId, 10);
      if (items.length > 0) {
        return { platform: 'weibo', accountId, accountName: accountName || accountId, items };
      }
    }
  } catch (error) {
    console.error(`Fetch account content error (${platform}/${accountId}):`, error);
  }

  return null;
}
