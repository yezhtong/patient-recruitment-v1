"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/admin-session";
import { writeAuditLog } from "@/lib/audit";

const groupSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(2, "slug 至少 2 字符")
    .max(60)
    .regex(/^[a-z0-9-]+$/, "slug 只允许小写字母、数字与短横"),
  name: z.string().trim().min(1, "名称不能为空").max(40),
  diseaseTag: z.string().trim().max(40).optional().nullable(),
  introduction: z.string().trim().max(500).optional().nullable(),
  isEnabled: z.boolean(),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(100),
  coverMediaId: z.string().trim().max(128).optional().nullable(),
});

export type GroupFormState = { ok?: boolean; error?: string };

function readGroupForm(formData: FormData) {
  return {
    slug: formData.get("slug"),
    name: formData.get("name"),
    diseaseTag: formData.get("diseaseTag") || null,
    introduction: formData.get("introduction") || null,
    isEnabled: formData.get("isEnabled") !== "false",
    sortOrder: formData.get("sortOrder") || 100,
    coverMediaId: formData.get("coverMediaId") || null,
  };
}

function revalidateGroupPaths() {
  revalidatePath("/admin/community/groups");
  revalidatePath("/community");
  revalidatePath("/sitemap.xml");
}

export async function createCommunityGroup(
  _prev: GroupFormState,
  formData: FormData,
): Promise<GroupFormState> {
  const session = await requireAdminRole();
  const parsed = groupSchema.safeParse(readGroupForm(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "表单校验失败" };
  }
  const data = parsed.data;

  const existing = await prisma.communityGroup.findUnique({ where: { slug: data.slug } });
  if (existing) return { error: "slug 已存在，换一个" };

  const created = await prisma.communityGroup.create({ data });

  await writeAuditLog({
    session,
    action: "create",
    entityType: "community-group",
    entityId: created.id,
    summary: `新建社区分区: ${created.name} (${created.slug})`,
    detail: { slug: created.slug, diseaseTag: created.diseaseTag, isEnabled: created.isEnabled },
  });

  revalidateGroupPaths();
  redirect("/admin/community/groups");
}

export async function updateCommunityGroup(
  id: string,
  _prev: GroupFormState,
  formData: FormData,
): Promise<GroupFormState> {
  const session = await requireAdminRole();
  const parsed = groupSchema.safeParse(readGroupForm(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "表单校验失败" };
  }
  const data = parsed.data;

  const conflict = await prisma.communityGroup.findFirst({
    where: { slug: data.slug, NOT: { id } },
    select: { id: true },
  });
  if (conflict) return { error: "slug 已被其他分区使用" };

  const before = await prisma.communityGroup.findUnique({
    where: { id },
    select: { slug: true, name: true, isEnabled: true, sortOrder: true },
  });

  const updated = await prisma.communityGroup.update({ where: { id }, data });

  await writeAuditLog({
    session,
    action: "update",
    entityType: "community-group",
    entityId: updated.id,
    summary: `更新社区分区: ${updated.name}`,
    detail: { before, after: { slug: updated.slug, name: updated.name, isEnabled: updated.isEnabled, sortOrder: updated.sortOrder } },
  });

  revalidateGroupPaths();
  revalidatePath(`/community/${updated.slug}`);
  return { ok: true };
}

export async function deleteCommunityGroup(id: string): Promise<GroupFormState> {
  const session = await requireAdminRole();
  const group = await prisma.communityGroup.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      slug: true,
      _count: { select: { posts: true } },
    },
  });
  if (!group) return { error: "分区不存在" };
  if (group._count.posts > 0) {
    return {
      error: `该分区已有 ${group._count.posts} 条帖子，请先迁移或隐藏后再删除`,
    };
  }

  await prisma.communityGroup.update({ where: { id }, data: { isEnabled: false } });

  await writeAuditLog({
    session,
    action: "soft_delete",
    entityType: "community-group",
    entityId: id,
    summary: `软删社区分区: ${group.name} (${group.slug})`,
  });

  revalidateGroupPaths();
  redirect("/admin/community/groups");
}

export async function toggleCommunityGroup(
  id: string,
  isEnabled: boolean,
): Promise<GroupFormState> {
  const session = await requireAdminRole();
  const group = await prisma.communityGroup.findUnique({
    where: { id },
    select: { id: true, name: true, slug: true },
  });
  if (!group) return { error: "分区不存在" };

  await prisma.communityGroup.update({ where: { id }, data: { isEnabled } });

  await writeAuditLog({
    session,
    action: isEnabled ? "enable" : "disable",
    entityType: "community-group",
    entityId: id,
    summary: `${isEnabled ? "启用" : "禁用"}社区分区: ${group.name}`,
  });

  revalidateGroupPaths();
  revalidatePath(`/community/${group.slug}`);
  return { ok: true };
}
