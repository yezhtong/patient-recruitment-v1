"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomBytes } from "crypto";
import { z } from "zod";
import { writeAuditLog } from "@/lib/audit";
import { requireAdminRole } from "@/lib/admin-session";
import { prisma } from "@/lib/prisma";

const FAQ_CATEGORIES = [
  "general",
  "trial-process",
  "safety",
  "privacy",
  "costs",
  "enrollment",
  "withdraw",
] as const;

const faqSchema = z.object({
  slug: z
    .string()
    .trim()
    .max(80)
    .regex(/^[a-z0-9-]*$/, "slug 只允许小写字母、数字与短横")
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
  question: z.string().trim().min(2).max(200),
  answer: z.string().trim().min(2).max(5000),
  category: z.enum(FAQ_CATEGORIES),
  tags: z.string().max(200).optional().nullable(),
  order: z.coerce.number().int().min(0).max(10000),
  isPublished: z.boolean(),
});

export type FaqFormState = { error?: string; ok?: boolean };

function readForm(fd: FormData) {
  return {
    slug: fd.get("slug"),
    question: fd.get("question"),
    answer: fd.get("answer"),
    category: fd.get("category"),
    tags: fd.get("tags") || null,
    order: fd.get("order") || 100,
    isPublished: fd.get("isPublished") === "on",
  };
}

function revalidateFaq() {
  revalidatePath("/admin/faq");
  revalidatePath("/faq");
  revalidatePath("/sitemap.xml");
}

async function generateSlug(): Promise<string> {
  for (let i = 0; i < 3; i++) {
    const candidate = `faq-${randomBytes(3).toString("hex")}`;
    const exists = await prisma.faqArticle.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!exists) return candidate;
  }
  throw new Error("slug 生成失败，请手动指定");
}

export async function createFaq(
  _prev: FaqFormState,
  fd: FormData,
): Promise<FaqFormState> {
  const session = await requireAdminRole();
  const parsed = faqSchema.safeParse(readForm(fd));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "表单校验失败" };
  }
  const data = parsed.data;

  const slug = data.slug ?? (await generateSlug());

  const exists = await prisma.faqArticle.findUnique({ where: { slug }, select: { id: true } });
  if (exists) return { error: "slug 已存在，换一个" };

  const created = await prisma.faqArticle.create({ data: { ...data, slug } });

  await writeAuditLog({
    session,
    action: "faq.create",
    entityType: "faq",
    entityId: created.id,
    summary: `新建 FAQ：${created.question.slice(0, 40)}`,
    detail: { slug: created.slug, category: created.category, isPublished: created.isPublished },
  });

  revalidateFaq();
  redirect("/admin/faq");
}

export async function updateFaq(
  id: string,
  _prev: FaqFormState,
  fd: FormData,
): Promise<FaqFormState> {
  const session = await requireAdminRole();
  const parsed = faqSchema.safeParse(readForm(fd));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "表单校验失败" };
  }
  const data = parsed.data;

  if (!data.slug) return { error: "编辑时 slug 不能为空" };
  const slug = data.slug;

  const other = await prisma.faqArticle.findFirst({
    where: { slug, NOT: { id } },
    select: { id: true },
  });
  if (other) return { error: "slug 已被其他 FAQ 使用" };

  const before = await prisma.faqArticle.findUnique({
    where: { id },
    select: { slug: true, category: true, isPublished: true, order: true },
  });

  const updated = await prisma.faqArticle.update({ where: { id }, data: { ...data, slug } });

  await writeAuditLog({
    session,
    action: "faq.update",
    entityType: "faq",
    entityId: updated.id,
    summary: `更新 FAQ：${updated.question.slice(0, 40)}`,
    detail: { before, after: { slug: updated.slug, category: updated.category, isPublished: updated.isPublished, order: updated.order } },
  });

  revalidateFaq();
  return { ok: true };
}

export async function deleteFaq(id: string): Promise<void> {
  const session = await requireAdminRole();
  const faq = await prisma.faqArticle.findUnique({
    where: { id },
    select: { id: true, slug: true, question: true },
  });
  if (!faq) redirect("/admin/faq");
  await prisma.faqArticle.delete({ where: { id } });
  await writeAuditLog({
    session,
    action: "faq.delete",
    entityType: "faq",
    entityId: faq!.id,
    summary: `删除 FAQ：${faq!.question.slice(0, 40)}`,
    detail: { slug: faq!.slug },
  });
  revalidateFaq();
  redirect("/admin/faq");
}

export async function toggleFaqPublished(id: string): Promise<void> {
  const session = await requireAdminRole();
  const cur = await prisma.faqArticle.findUnique({
    where: { id },
    select: { id: true, isPublished: true, question: true },
  });
  if (!cur) return;
  const next = !cur.isPublished;
  await prisma.faqArticle.update({ where: { id }, data: { isPublished: next } });
  await writeAuditLog({
    session,
    action: next ? "faq.publish" : "faq.unpublish",
    entityType: "faq",
    entityId: id,
    summary: `${next ? "发布" : "下架"} FAQ：${cur.question.slice(0, 40)}`,
  });
  revalidateFaq();
}
