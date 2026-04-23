import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";

/**
 * M8.1 · 统一行为日志写入。
 * - 登录态传 userId；游客态传 guestToken
 * - IP 只存前 16 位 sha256 哈希，不落盘明文
 * - 写入失败不抛错（打点不应阻塞主流程）
 */
export async function writeBehaviorLog(input: {
  userId?: string | null;
  guestToken?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
}): Promise<void> {
  try {
    const h = await headers();
    const userAgent = h.get("user-agent") ?? undefined;
    const fwd = h.get("x-forwarded-for") ?? h.get("x-real-ip") ?? "";
    const rawIp = fwd.split(",")[0]?.trim() || "";
    const ipHash = rawIp
      ? createHash("sha256").update(rawIp).digest("hex").slice(0, 16)
      : null;

    await prisma.userBehaviorLog.create({
      data: {
        userId: input.userId ?? null,
        guestToken: input.guestToken ?? null,
        action: input.action,
        targetType: input.targetType ?? null,
        targetId: input.targetId ?? null,
        userAgent: userAgent ?? null,
        ipHash,
      },
    });
  } catch (err) {
    console.warn("[behavior-log] write failed", err);
  }
}

/**
 * 便捷函数：试验详情页埋点
 */
export function logTrialDetailView(params: {
  userId?: string | null;
  guestToken?: string | null;
  trialId: string;
}) {
  return writeBehaviorLog({
    userId: params.userId,
    guestToken: params.guestToken,
    action: "trial_detail_view",
    targetType: "ClinicalTrial",
    targetId: params.trialId,
  });
}
