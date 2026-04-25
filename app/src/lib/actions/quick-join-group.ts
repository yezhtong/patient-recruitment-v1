"use server";

/**
 * 推荐分区弹窗专用：轻量加入分区
 * 复用 confirmJoinGroup 的核心 upsert 逻辑，
 * 跳过"症状表单 + disclaimer"环节（弹窗场景用户已在注册时填过症状）。
 */

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getUserSession, isLoggedIn } from "@/lib/user-session";

export async function quickJoinGroupAction(
  groupId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getUserSession();
  if (!isLoggedIn(session)) return { ok: false, error: "未登录" };

  const group = await prisma.communityGroup.findUnique({
    where: { id: groupId },
    select: { id: true, name: true, slug: true },
  });
  if (!group) return { ok: false, error: "分区不存在" };

  const userId = session.userId;

  const memberships = await prisma.userGroupMembership.findMany({
    where: { userId, leftAt: null },
    select: { id: true, groupId: true },
  });

  const alreadyMember = memberships.some((m) => m.groupId === group.id);
  if (alreadyMember) return { ok: true };

  if (memberships.length >= 3) {
    return { ok: false, error: "最多加入 3 个分区，请先退出一个" };
  }

  await prisma.$transaction(async (tx) => {
    await tx.userGroupMembership.upsert({
      where: { userId_groupId: { userId, groupId: group.id } },
      create: { userId, groupId: group.id },
      update: { leftAt: null, joinedAt: new Date() },
    });

    await tx.auditLog.create({
      data: {
        operatorId: userId,
        operatorUsername: session.phone,
        operatorDisplayName: session.displayName ?? null,
        operatorRole: "user",
        action: "community.group.quick_join",
        entityType: "community-group",
        entityId: group.id,
        summary: `用户通过推荐弹窗快速加入分区: ${group.name} (${group.slug})`,
      },
    });
  });

  revalidatePath(`/community/${group.slug}`);
  revalidatePath("/me");

  return { ok: true };
}
