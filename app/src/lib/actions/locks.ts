"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-session";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

/**
 * M8.1 · 封锁管理 · server actions
 * - 解锁（approve 申诉 / 主动解锁）
 * - 驳回申诉（保持锁定）
 * 权限：requireAdmin()（operator 与 admin 都可执行，沿用 M6 现实）
 */

const UnlockSchema = z.object({
  lockId: z.string().trim().min(1),
  replyText: z
    .string()
    .trim()
    .min(5, "解锁理由至少 5 个字")
    .max(500, "解锁理由最多 500 字"),
});

const RejectSchema = z.object({
  lockId: z.string().trim().min(1),
  replyText: z
    .string()
    .trim()
    .min(5, "驳回理由至少 5 个字")
    .max(500, "驳回理由最多 500 字"),
});

export type LockActionState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "ok"; message: string };

function revalidateLocks(lockId?: string) {
  revalidatePath("/admin/locks");
  if (lockId) revalidatePath(`/admin/locks/${lockId}`);
  revalidatePath("/account-locked");
}

export async function unlockAccount(
  _prev: LockActionState,
  formData: FormData,
): Promise<LockActionState> {
  const session = await requireAdmin();

  const parsed = UnlockSchema.safeParse({
    lockId: formData.get("lockId"),
    replyText: formData.get("replyText"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "表单校验失败",
    };
  }

  const { lockId, replyText } = parsed.data;

  const lock = await prisma.accountLock.findUnique({
    where: { id: lockId },
    select: {
      id: true,
      userId: true,
      unlockedAt: true,
      appealStatus: true,
      user: { select: { phone: true, displayName: true } },
    },
  });
  if (!lock) return { status: "error", message: "封锁记录不存在" };
  if (lock.unlockedAt) return { status: "error", message: "该账号已经解锁过了" };

  const now = new Date();
  await prisma.accountLock.update({
    where: { id: lockId },
    data: {
      unlockedAt: now,
      unlockedBy: session.operatorId,
      unlockReason: replyText,
      // 若已申诉，一并标记为已处理
      appealStatus: lock.appealStatus === "none" ? "none" : "approved",
      appealReplyText: replyText,
      appealHandledBy: session.operatorId,
      appealHandledAt: now,
    },
  });

  await writeAuditLog({
    session,
    action: "account_lock.unlock",
    entityType: "account_lock",
    entityId: lockId,
    summary: `解锁用户 ${lock.user.phone}（${lock.user.displayName ?? "未命名"}）`,
    detail: { reason: replyText, userId: lock.userId },
  });

  revalidateLocks(lockId);
  return { status: "ok", message: "已解锁并回复用户" };
}

export async function rejectAppeal(
  _prev: LockActionState,
  formData: FormData,
): Promise<LockActionState> {
  const session = await requireAdmin();

  const parsed = RejectSchema.safeParse({
    lockId: formData.get("lockId"),
    replyText: formData.get("replyText"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "表单校验失败",
    };
  }

  const { lockId, replyText } = parsed.data;

  const lock = await prisma.accountLock.findUnique({
    where: { id: lockId },
    select: {
      id: true,
      userId: true,
      unlockedAt: true,
      appealStatus: true,
      user: { select: { phone: true, displayName: true } },
    },
  });
  if (!lock) return { status: "error", message: "封锁记录不存在" };
  if (lock.unlockedAt) return { status: "error", message: "该账号已经解锁" };
  if (lock.appealStatus !== "pending")
    return { status: "error", message: "当前没有待处理的申诉" };

  const now = new Date();
  await prisma.accountLock.update({
    where: { id: lockId },
    data: {
      appealStatus: "rejected",
      appealReplyText: replyText,
      appealHandledBy: session.operatorId,
      appealHandledAt: now,
    },
  });

  await writeAuditLog({
    session,
    action: "account_lock.appeal_reject",
    entityType: "account_lock",
    entityId: lockId,
    summary: `驳回 ${lock.user.phone} 的申诉`,
    detail: { reason: replyText, userId: lock.userId },
  });

  revalidateLocks(lockId);
  return { status: "ok", message: "已驳回申诉" };
}
