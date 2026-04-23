import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

/**
 * M8.1 · 登录用户 lock 守卫
 *
 * 在一个 server component 顶部调用：
 *   await requireNotLocked(session.userId);
 *
 * 若用户有未解锁的 `AccountLock`，直接重定向到 `/account-locked`。
 * 由于 middleware 运行在 edge runtime 不能访问 Prisma，各高频路由显式调用本函数。
 */
export async function requireNotLocked(userId: string | undefined | null) {
  if (!userId) return;
  const lock = await prisma.accountLock.findUnique({
    where: { userId },
    select: { id: true, unlockedAt: true },
  });
  if (lock && !lock.unlockedAt) {
    redirect("/account-locked");
  }
}

/**
 * 查询单条锁（用于封锁页 / 申诉页展示）。
 */
export async function getActiveLock(userId: string | undefined | null) {
  if (!userId) return null;
  const lock = await prisma.accountLock.findUnique({ where: { userId } });
  if (!lock || lock.unlockedAt) return null;
  return lock;
}

/**
 * 查询最近一次锁（包括已解锁的，用于申诉历史展示）。
 */
export async function getLatestLock(userId: string | undefined | null) {
  if (!userId) return null;
  return prisma.accountLock.findUnique({ where: { userId } });
}
