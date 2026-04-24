"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getUserSession, isLoggedIn } from "@/lib/user-session";
import { analyzeSymptoms, type DiseaseTag } from "@/lib/disease-matcher";
import { mergeDiseaseTags, appendSymptomsText } from "@/lib/group-join";

const symptomsSchema = z
  .string()
  .trim()
  .min(10, "症状描述至少 10 字")
  .max(200, "症状描述不超过 200 字");

const diseaseTagSchema = z.object({
  label: z.string(),
  keyword: z.string(),
  confidence: z.number().min(0).max(1),
});

export async function analyzeJoinSymptoms(input: {
  groupSlug: string;
  joinSymptoms: string;
}): Promise<{ ok: true; tags: DiseaseTag[]; groupName: string } | { ok: false; error: string }> {
  const session = await getUserSession();
  if (!isLoggedIn(session)) return { ok: false, error: "未登录" };

  const parsed = symptomsSchema.safeParse(input.joinSymptoms);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "症状描述校验失败" };
  }

  const group = await prisma.communityGroup.findUnique({
    where: { slug: input.groupSlug },
    select: { name: true },
  });
  if (!group) return { ok: false, error: "分区不存在" };

  const tags = await analyzeSymptoms(parsed.data);
  return { ok: true, tags, groupName: group.name };
}

export async function confirmJoinGroup(input: {
  groupSlug: string;
  joinSymptoms: string;
  confirmedTags: DiseaseTag[];
  agreeDisclaimer: boolean;
}): Promise<{ ok: true; redirectTo: string } | { ok: false; error: string }> {
  const session = await getUserSession();
  if (!isLoggedIn(session)) return { ok: false, error: "未登录" };

  const schema = z.object({
    joinSymptoms: symptomsSchema,
    agreeDisclaimer: z.literal(true, { error: "请同意免责声明" }),
    confirmedTags: z.array(diseaseTagSchema),
  });

  const parsed = schema.safeParse({
    joinSymptoms: input.joinSymptoms,
    agreeDisclaimer: input.agreeDisclaimer,
    confirmedTags: input.confirmedTags,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "参数校验失败" };
  }

  const group = await prisma.communityGroup.findUnique({
    where: { slug: input.groupSlug },
    select: { id: true, name: true, slug: true },
  });
  if (!group) return { ok: false, error: "分区不存在" };

  const userId = session.userId;
  const redirectTo = `/community/${group.slug}`;

  const memberships = await prisma.userGroupMembership.findMany({
    where: { userId, leftAt: null },
    select: { id: true, groupId: true },
  });

  const alreadyMember = memberships.some((m) => m.groupId === group.id);
  if (alreadyMember) {
    return { ok: true, redirectTo };
  }

  if (memberships.length >= 3) {
    return { ok: false, error: "最多加入 3 个分区，请先退出一个" };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { symptomsText: true, aiDiseaseTags: true },
  });

  const existingTags: DiseaseTag[] = (() => {
    if (!user?.aiDiseaseTags) return [];
    try {
      const parsed: unknown = JSON.parse(user.aiDiseaseTags);
      return Array.isArray(parsed) ? (parsed as DiseaseTag[]) : [];
    } catch {
      return [];
    }
  })();

  const mergedTags = mergeDiseaseTags(existingTags, parsed.data.confirmedTags);
  const mergedSymptoms = appendSymptomsText(
    user?.symptomsText,
    group.name,
    parsed.data.joinSymptoms,
  );

  await prisma.$transaction(async (tx) => {
    await tx.userGroupMembership.upsert({
      where: { userId_groupId: { userId, groupId: group.id } },
      create: {
        userId,
        groupId: group.id,
        joinSymptoms: parsed.data.joinSymptoms,
        joinDiseaseTagsJson: JSON.stringify(parsed.data.confirmedTags),
      },
      update: {
        leftAt: null,
        joinedAt: new Date(),
        joinSymptoms: parsed.data.joinSymptoms,
        joinDiseaseTagsJson: JSON.stringify(parsed.data.confirmedTags),
      },
    });

    await tx.user.update({
      where: { id: userId },
      data: {
        symptomsText: mergedSymptoms,
        aiDiseaseTags: JSON.stringify(mergedTags),
        symptomsUpdatedAt: new Date(),
      },
    });

    await tx.auditLog.create({
      data: {
        operatorId: userId,
        operatorRole: "user",
        action: "community.group.join",
        entityType: "community-group",
        entityId: group.id,
        summary: `用户加入分区: ${group.name} (${group.slug})`,
      },
    });
  });

  revalidatePath(`/community/${group.slug}`);
  revalidatePath("/me/groups");

  return { ok: true, redirectTo };
}

export async function leaveGroup(input: {
  groupSlug: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getUserSession();
  if (!isLoggedIn(session)) return { ok: false, error: "未登录" };

  const group = await prisma.communityGroup.findUnique({
    where: { slug: input.groupSlug },
    select: { id: true, name: true, slug: true },
  });
  if (!group) return { ok: false, error: "分区不存在" };

  const userId = session.userId;

  const membership = await prisma.userGroupMembership.findUnique({
    where: { userId_groupId: { userId, groupId: group.id } },
    select: { id: true, leftAt: true },
  });

  if (!membership || membership.leftAt !== null) {
    return { ok: false, error: "你尚未加入该分区" };
  }

  await prisma.$transaction(async (tx) => {
    await tx.userGroupMembership.update({
      where: { id: membership.id },
      data: { leftAt: new Date() },
    });

    await tx.auditLog.create({
      data: {
        operatorId: userId,
        operatorRole: "user",
        action: "community.group.leave",
        entityType: "community-group",
        entityId: group.id,
        summary: `用户退出分区: ${group.name} (${group.slug})`,
      },
    });
  });

  revalidatePath(`/community/${group.slug}`);
  revalidatePath("/me/groups");

  return { ok: true };
}
