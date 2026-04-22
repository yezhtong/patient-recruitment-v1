"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/admin-session";
import { writeAuditLog } from "@/lib/audit";
import { invalidateSensitiveWordsCache } from "@/lib/sensitive-words";

const RISK_TYPES = ["contact", "drug-sale", "enroll-promise", "quackery", "ad"] as const;
const RISK_LEVELS = ["high", "medium", "low"] as const;

const wordSchema = z.object({
  keyword: z.string().trim().min(2, "关键词至少 2 个字符，单字会造成误拦截").max(50),
  riskType: z.enum(RISK_TYPES, { message: "riskType 无效" }),
  riskLevel: z.enum(RISK_LEVELS, { message: "riskLevel 无效" }),
  isEnabled: z.boolean(),
  note: z.string().max(200).optional().nullable(),
});

export type SensitiveWordFormState = { ok?: boolean; error?: string };

export async function createSensitiveWord(
  _prev: SensitiveWordFormState,
  formData: FormData,
): Promise<SensitiveWordFormState> {
  const session = await requireAdminRole();
  const parsed = wordSchema.safeParse({
    keyword: formData.get("keyword"),
    riskType: formData.get("riskType"),
    riskLevel: formData.get("riskLevel"),
    isEnabled: formData.get("isEnabled") !== "false",
    note: formData.get("note") || null,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "表单校验失败" };
  }
  const data = parsed.data;

  const existing = await prisma.sensitiveWord.findUnique({ where: { keyword: data.keyword } });
  if (existing) return { error: "关键词已存在" };

  const created = await prisma.sensitiveWord.create({ data });
  invalidateSensitiveWordsCache();

  await writeAuditLog({
    session,
    action: "create",
    entityType: "sensitive-word",
    entityId: created.id,
    summary: `新建敏感词: ${created.keyword} (${created.riskLevel}/${created.riskType})`,
  });

  revalidatePath("/admin/community/sensitive-words");
  return { ok: true };
}

export async function updateSensitiveWord(
  id: string,
  _prev: SensitiveWordFormState,
  formData: FormData,
): Promise<SensitiveWordFormState> {
  const session = await requireAdminRole();
  const parsed = wordSchema.safeParse({
    keyword: formData.get("keyword"),
    riskType: formData.get("riskType"),
    riskLevel: formData.get("riskLevel"),
    isEnabled: formData.get("isEnabled") !== "false",
    note: formData.get("note") || null,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "表单校验失败" };
  }
  const data = parsed.data;

  const conflict = await prisma.sensitiveWord.findFirst({
    where: { keyword: data.keyword, NOT: { id } },
    select: { id: true },
  });
  if (conflict) return { error: "关键词已存在" };

  const updated = await prisma.sensitiveWord.update({ where: { id }, data });
  invalidateSensitiveWordsCache();

  await writeAuditLog({
    session,
    action: "update",
    entityType: "sensitive-word",
    entityId: updated.id,
    summary: `更新敏感词: ${updated.keyword}`,
    detail: data,
  });

  revalidatePath("/admin/community/sensitive-words");
  return { ok: true };
}

export async function deleteSensitiveWord(id: string): Promise<SensitiveWordFormState> {
  const session = await requireAdminRole();
  const word = await prisma.sensitiveWord.findUnique({ where: { id } });
  if (!word) return { error: "词条不存在" };

  await prisma.sensitiveWord.delete({ where: { id } });
  invalidateSensitiveWordsCache();

  await writeAuditLog({
    session,
    action: "delete",
    entityType: "sensitive-word",
    entityId: id,
    summary: `删除敏感词: ${word.keyword}`,
  });

  revalidatePath("/admin/community/sensitive-words");
  return { ok: true };
}

export async function toggleSensitiveWord(
  id: string,
  isEnabled: boolean,
): Promise<SensitiveWordFormState> {
  const session = await requireAdminRole();
  const word = await prisma.sensitiveWord.findUnique({ where: { id } });
  if (!word) return { error: "词条不存在" };

  await prisma.sensitiveWord.update({ where: { id }, data: { isEnabled } });
  invalidateSensitiveWordsCache();

  await writeAuditLog({
    session,
    action: isEnabled ? "enable" : "disable",
    entityType: "sensitive-word",
    entityId: id,
    summary: `${isEnabled ? "启用" : "禁用"}敏感词: ${word.keyword}`,
  });

  revalidatePath("/admin/community/sensitive-words");
  return { ok: true };
}

type ParsedWord = { keyword: string; riskType: string; riskLevel: string; isEnabled: boolean };

export type BulkImportResult = {
  ok: boolean;
  phase: "preview" | "committed";
  created: number;
  updated: number;
  failed: number;
  errors: string[];
  toCreate?: ParsedWord[];
  toUpdate?: ParsedWord[];
};

export async function bulkImportSensitiveWords(
  _prev: BulkImportResult | null,
  formData: FormData,
): Promise<BulkImportResult> {
  const session = await requireAdminRole();
  const raw = String(formData.get("content") ?? "");
  const dryRun = formData.get("dryRun") === "1";
  const lines = raw.split("\n");

  const toCreate: ParsedWord[] = [];
  const toUpdate: ParsedWord[] = [];
  let failed = 0;
  const errors: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith("#")) continue;
    const parts = line.split("|");
    if (parts.length !== 3) {
      errors.push(`第 ${i + 1} 行格式错误（应为 level|type|keyword）`);
      failed++;
      continue;
    }
    const [riskLevel, riskType, keyword] = parts.map((s) => s.trim());
    const parsed = wordSchema.safeParse({ keyword, riskType, riskLevel, isEnabled: true });
    if (!parsed.success) {
      errors.push(`第 ${i + 1} 行校验失败: ${parsed.error.issues[0]?.message}`);
      failed++;
      continue;
    }
    const existing = await prisma.sensitiveWord.findUnique({ where: { keyword } });
    if (existing) {
      toUpdate.push(parsed.data);
    } else {
      toCreate.push(parsed.data);
    }
  }

  if (dryRun) {
    return {
      ok: true,
      phase: "preview",
      created: toCreate.length,
      updated: toUpdate.length,
      failed,
      errors,
      toCreate,
      toUpdate,
    };
  }

  // 真写
  let writeErrors = 0;
  for (const word of toCreate) {
    try {
      await prisma.sensitiveWord.create({ data: word });
    } catch {
      errors.push(`写入失败: ${word.keyword}`);
      writeErrors++;
    }
  }
  for (const word of toUpdate) {
    try {
      await prisma.sensitiveWord.update({
        where: { keyword: word.keyword },
        data: { riskLevel: word.riskLevel, riskType: word.riskType },
      });
    } catch {
      errors.push(`更新失败: ${word.keyword}`);
      writeErrors++;
    }
  }

  invalidateSensitiveWordsCache();

  const actualCreated = toCreate.length - writeErrors;
  const actualUpdated = toUpdate.length;
  await writeAuditLog({
    session,
    action: "bulk-import",
    entityType: "sensitive-word",
    summary: `批量导入敏感词：新增 ${actualCreated} / 更新 ${actualUpdated} / 失败 ${failed + writeErrors} 条`,
    detail: { created: actualCreated, updated: actualUpdated, failed: failed + writeErrors, errors },
  });

  revalidatePath("/admin/community/sensitive-words");
  return { ok: true, phase: "committed", created: actualCreated, updated: actualUpdated, failed: failed + writeErrors, errors };
}
