"use server";

import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/admin-session";
import { writeAuditLog } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// ===== Schema =====

const formItemSchema = z.object({
  fieldKey: z
    .string()
    .trim()
    .min(1, "字段 Key 不能为空")
    .max(60, "字段 Key 不能超过 60 字")
    .regex(/^[a-z0-9_]+$/, "字段 Key 只能包含小写字母、数字和下划线"),
  label: z.string().trim().min(1, "标签不能为空").max(200, "标签最长 200 字"),
  helpText: z.string().trim().max(500, "辅助说明最长 500 字").optional(),
  fieldType: z.enum(["single", "multi", "text", "textarea", "number", "date", "agree"]),
  options: z
    .array(
      z.object({
        value: z.string().trim().min(1),
        label: z.string().trim().min(1),
      }),
    )
    .optional(),
  placeholder: z.string().trim().max(200).optional(),
  defaultValue: z.any().optional(),
  isRequired: z.boolean().default(false),
  minValue: z.number().optional(),
  maxValue: z.number().optional(),
  regex: z.string().trim().optional(),
  errorMessage: z.string().trim().max(200).optional(),
  showWhen: z.object({
    fieldKey: z.string(),
    op: z.enum(["eq", "neq", "in", "notIn"]),
    value: z.any(),
  }).optional(),
});

export type FormItemInput = z.infer<typeof formItemSchema>;

export type FormItemState = {
  ok?: boolean;
  error?: string;
  fieldKeyError?: string;
};

export type FormState = {
  ok?: boolean;
  error?: string;
};

// ===== Helpers =====

/**
 * 校验 fieldKey 在该表单内的唯一性
 * @param formId 表单 ID
 * @param fieldKey 待校验的 key
 * @param excludeItemId 排除的 item ID（编辑时）
 */
async function checkFieldKeyUnique(
  formId: string,
  fieldKey: string,
  excludeItemId?: string,
): Promise<boolean> {
  const existing = await prisma.trialPrescreenFormItem.findFirst({
    where: {
      formId,
      fieldKey,
      ...(excludeItemId ? { NOT: { id: excludeItemId } } : {}),
    },
  });
  return !existing;
}

/**
 * 校验 showWhen 规则里的 fieldKey 是否存在
 */
async function validateShowWhenRefs(
  formId: string,
  showWhen: FormItemInput["showWhen"],
): Promise<{ valid: boolean; error?: string }> {
  if (!showWhen) return { valid: true };

  const field = await prisma.trialPrescreenFormItem.findFirst({
    where: { formId, fieldKey: showWhen.fieldKey },
  });

  if (!field) {
    return { valid: false, error: `跳题规则引用的字段「${showWhen.fieldKey}」不存在` };
  }

  return { valid: true };
}

// ===== Actions =====

/**
 * T4.1 · 创建字段
 */
export async function createFormItem(
  formId: string,
  input: FormItemInput,
): Promise<FormItemState> {
  const session = await requireAdminRole();

  // 验证 input
  const parsed = formItemSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "表单校验失败" };
  }
  const data = parsed.data;

  // 查询表单
  const form = await prisma.trialPrescreenForm.findUnique({
    where: { id: formId },
    select: { id: true, trialId: true },
  });
  if (!form) {
    return { error: "表单不存在" };
  }

  // 校验 fieldKey 唯一性
  const keyUnique = await checkFieldKeyUnique(formId, data.fieldKey);
  if (!keyUnique) {
    return { fieldKeyError: `字段 Key「${data.fieldKey}」已存在，请改一个` };
  }

  // 校验 showWhen
  if (data.showWhen) {
    const refValid = await validateShowWhenRefs(formId, data.showWhen);
    if (!refValid.valid) {
      return { error: refValid.error };
    }
  }

  // 获取最大 sortOrder
  const maxSort = await prisma.trialPrescreenFormItem.aggregate({
    where: { formId },
    _max: { sortOrder: true },
  });
  const nextSort = (maxSort._max.sortOrder ?? 0) + 10;

  // 创建字段
  const item = await prisma.trialPrescreenFormItem.create({
    data: {
      formId,
      fieldKey: data.fieldKey,
      label: data.label,
      helpText: data.helpText,
      fieldType: data.fieldType,
      options: data.options ? JSON.stringify(data.options) : null,
      placeholder: data.placeholder,
      defaultValue: data.defaultValue ? JSON.stringify(data.defaultValue) : null,
      isRequired: data.isRequired,
      minValue: data.minValue,
      maxValue: data.maxValue,
      regex: data.regex,
      errorMessage: data.errorMessage,
      showWhen: data.showWhen ? JSON.stringify(data.showWhen) : null,
      sortOrder: nextSort,
    },
  });

  // 审计日志
  await writeAuditLog({
    session,
    action: "create",
    entityType: "trial-prescreen-form-item",
    entityId: item.id,
    summary: `新增预筛字段: ${item.label} (${item.fieldKey}) [表单 ${form.trialId}]`,
    detail: {
      formId,
      fieldKey: item.fieldKey,
      fieldType: item.fieldType,
    },
  });

  revalidatePath(`/admin/trials/${form.trialId}/form`);
  return { ok: true };
}

/**
 * T4.2 · 更新字段
 */
export async function updateFormItem(
  itemId: string,
  input: FormItemInput,
): Promise<FormItemState> {
  const session = await requireAdminRole();

  // 验证 input
  const parsed = formItemSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "表单校验失败" };
  }
  const data = parsed.data;

  // 查询字段及其表单
  const item = await prisma.trialPrescreenFormItem.findUnique({
    where: { id: itemId },
    select: { id: true, formId: true, label: true, fieldKey: true },
  });
  if (!item) {
    return { error: "字段不存在" };
  }

  const form = await prisma.trialPrescreenForm.findUnique({
    where: { id: item.formId },
    select: { trialId: true },
  });
  if (!form) {
    return { error: "表单不存在" };
  }

  // 如果改了 fieldKey，校验新 key 的唯一性
  if (data.fieldKey !== item.fieldKey) {
    const keyUnique = await checkFieldKeyUnique(item.formId, data.fieldKey, itemId);
    if (!keyUnique) {
      return { fieldKeyError: `字段 Key「${data.fieldKey}」已被其他字段使用` };
    }
  }

  // 校验 showWhen
  if (data.showWhen) {
    const refValid = await validateShowWhenRefs(item.formId, data.showWhen);
    if (!refValid.valid) {
      return { error: refValid.error };
    }
  }

  // 更新字段
  const updated = await prisma.trialPrescreenFormItem.update({
    where: { id: itemId },
    data: {
      fieldKey: data.fieldKey,
      label: data.label,
      helpText: data.helpText,
      fieldType: data.fieldType,
      options: data.options ? JSON.stringify(data.options) : null,
      placeholder: data.placeholder,
      defaultValue: data.defaultValue ? JSON.stringify(data.defaultValue) : null,
      isRequired: data.isRequired,
      minValue: data.minValue,
      maxValue: data.maxValue,
      regex: data.regex,
      errorMessage: data.errorMessage,
      showWhen: data.showWhen ? JSON.stringify(data.showWhen) : null,
    },
  });

  // 审计日志
  await writeAuditLog({
    session,
    action: "update",
    entityType: "trial-prescreen-form-item",
    entityId: updated.id,
    summary: `编辑预筛字段: ${updated.label} (${updated.fieldKey}) [表单 ${form.trialId}]`,
    detail: {
      before: { fieldKey: item.fieldKey, label: item.label },
      after: { fieldKey: updated.fieldKey, label: updated.label },
    },
  });

  revalidatePath(`/admin/trials/${form.trialId}/form`);
  return { ok: true };
}

/**
 * T4.3 · 删除字段
 */
export async function deleteFormItem(
  formId: string,
  itemId: string,
): Promise<FormItemState> {
  const session = await requireAdminRole();

  // 查询字段及其表单
  const item = await prisma.trialPrescreenFormItem.findUnique({
    where: { id: itemId },
    select: { id: true, formId: true, label: true, fieldKey: true },
  });
  if (!item || item.formId !== formId) {
    return { error: "字段不存在或不属于此表单" };
  }

  const form = await prisma.trialPrescreenForm.findUnique({
    where: { id: formId },
    select: { trialId: true },
  });
  if (!form) {
    return { error: "表单不存在" };
  }

  // 检查是否有 Lead 引用该字段（可选：严格模式下提示，宽松模式下继续删除）
  // 当前采用"宽松"，允许删除，Lead 的历史数据保留
  const leadCount = await prisma.lead.count({
    where: {
      projectAnswers: {
        contains: `"${item.fieldKey}"`,
      },
    },
  });

  if (leadCount > 0) {
    // 仅提示，不阻止删除
    console.warn(
      `[deleteFormItem] 字段 ${item.fieldKey} 有 ${leadCount} 条 Lead 引用，但仍然删除`,
    );
  }

  // 删除字段
  await prisma.trialPrescreenFormItem.delete({
    where: { id: itemId },
  });

  // 审计日志
  await writeAuditLog({
    session,
    action: "delete",
    entityType: "trial-prescreen-form-item",
    entityId: itemId,
    summary: `删除预筛字段: ${item.label} (${item.fieldKey}) [表单 ${form.trialId}] (${leadCount} 条 Lead 引用)`,
    detail: {
      fieldKey: item.fieldKey,
      label: item.label,
      leadCount,
    },
  });

  revalidatePath(`/admin/trials/${form.trialId}/form`);
  return { ok: true };
}

/**
 * T4.4 · 批量排序（用于拖拽重排）
 */
export async function reorderFormItems(
  formId: string,
  updates: Array<{ id: string; sortOrder: number }>,
): Promise<FormItemState> {
  const session = await requireAdminRole();

  // 查询表单
  const form = await prisma.trialPrescreenForm.findUnique({
    where: { id: formId },
    select: { trialId: true },
  });
  if (!form) {
    return { error: "表单不存在" };
  }

  // 批量更新（用事务保证原子性）
  try {
    await prisma.$transaction(
      updates.map(({ id, sortOrder }) =>
        prisma.trialPrescreenFormItem.update({
          where: { id },
          data: { sortOrder },
        }),
      ),
    );
  } catch (err) {
    return { error: "更新排序失败，请重试" };
  }

  // 审计日志（简化记录，不详细列出每一项）
  await writeAuditLog({
    session,
    action: "reorder",
    entityType: "trial-prescreen-form-items",
    entityId: formId,
    summary: `重新排序预筛表单字段: ${updates.length} 项 [表单 ${form.trialId}]`,
    detail: { count: updates.length },
  });

  revalidatePath(`/admin/trials/${form.trialId}/form`);
  return { ok: true };
}

/**
 * T4.5 · 发布表单（version++, isPublished=true）
 */
export async function publishForm(formId: string): Promise<FormState> {
  const session = await requireAdminRole();

  // 查询表单
  const form = await prisma.trialPrescreenForm.findUnique({
    where: { id: formId },
    select: { id: true, trialId: true, version: true, isPublished: true, items: true },
  });
  if (!form) {
    return { error: "表单不存在" };
  }

  // 验证：必须至少有 1 个字段
  if (form.items.length === 0) {
    return { error: "无法发布空表单，请至少添加 1 个字段" };
  }

  // 发布
  const updated = await prisma.trialPrescreenForm.update({
    where: { id: formId },
    data: {
      isPublished: true,
      version: form.version + 1,
      updatedAt: new Date(),
    },
  });

  // 审计日志
  await writeAuditLog({
    session,
    action: "publish",
    entityType: "trial-prescreen-form",
    entityId: formId,
    summary: `发布预筛表单: 版本 ${updated.version} [试验 ${form.trialId}]`,
    detail: {
      version: updated.version,
      itemCount: form.items.length,
    },
  });

  revalidatePath(`/admin/trials/${form.trialId}/form`);
  revalidatePath(`/prescreen`);
  return { ok: true };
}

/**
 * T4.6 · 撤回表单（isPublished=false）
 */
export async function unpublishForm(formId: string): Promise<FormState> {
  const session = await requireAdminRole();

  // 查询表单
  const form = await prisma.trialPrescreenForm.findUnique({
    where: { id: formId },
    select: { id: true, trialId: true, version: true },
  });
  if (!form) {
    return { error: "表单不存在" };
  }

  // 撤回
  const updated = await prisma.trialPrescreenForm.update({
    where: { id: formId },
    data: {
      isPublished: false,
      updatedAt: new Date(),
    },
  });

  // 审计日志
  await writeAuditLog({
    session,
    action: "unpublish",
    entityType: "trial-prescreen-form",
    entityId: formId,
    summary: `撤回预筛表单发布: 版本 ${updated.version} [试验 ${form.trialId}]`,
    detail: {
      version: updated.version,
    },
  });

  revalidatePath(`/admin/trials/${form.trialId}/form`);
  revalidatePath(`/prescreen`);
  return { ok: true };
}
