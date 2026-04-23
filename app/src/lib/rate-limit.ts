import { prisma } from "@/lib/prisma";

/** 注册用户：30 min 内去重 trial 数 */
export const REGISTERED_WINDOW_MINUTES = 30;
export const REGISTERED_TRIAL_DETAIL_LIMIT = 20;

/** 游客：累计 30 天窗口内去重 trial 数（配额 5） */
export const GUEST_WINDOW_DAYS = 30;
export const GUEST_TRIAL_DETAIL_QUOTA = 5;

/**
 * 查注册用户最近 windowMinutes 分钟内 `trial_detail_view` 的**去重 targetId 数**。
 * 用于反爬判定："30 min 内点开 20 条不同试验"→ 触发封锁。
 */
export async function countDistinctRecentTrialViews(
  userId: string,
  windowMinutes: number = REGISTERED_WINDOW_MINUTES,
): Promise<number> {
  const since = new Date(Date.now() - windowMinutes * 60 * 1000);
  const rows = await prisma.userBehaviorLog.findMany({
    where: {
      userId,
      action: "trial_detail_view",
      createdAt: { gte: since },
      targetId: { not: null },
    },
    select: { targetId: true },
  });
  const distinct = new Set<string>();
  for (const r of rows) if (r.targetId) distinct.add(r.targetId);
  return distinct.size;
}

/**
 * 查游客 guestToken 最近 windowDays 天内查看过的**不同试验**数。
 * 用于游客配额（PRD §5.1）：5 条免费，第 6 条强制注册。
 */
export async function countDistinctGuestTrialViews(
  guestToken: string,
  windowDays: number = GUEST_WINDOW_DAYS,
): Promise<number> {
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
  const rows = await prisma.userBehaviorLog.findMany({
    where: {
      guestToken,
      action: "trial_detail_view",
      createdAt: { gte: since },
      targetId: { not: null },
    },
    select: { targetId: true },
  });
  const distinct = new Set<string>();
  for (const r of rows) if (r.targetId) distinct.add(r.targetId);
  return distinct.size;
}

/**
 * 统一接口：注册用户访问试验详情时，决定"放行 / 要封锁"。
 * 已去重 + 包含当前 trial（调用方应在写入 behavior-log 之后再调用本函数）。
 */
export async function shouldLockUserForTrialViews(userId: string): Promise<{
  shouldLock: boolean;
  distinctCount: number;
}> {
  const distinctCount = await countDistinctRecentTrialViews(userId);
  return {
    shouldLock: distinctCount >= REGISTERED_TRIAL_DETAIL_LIMIT,
    distinctCount,
  };
}
