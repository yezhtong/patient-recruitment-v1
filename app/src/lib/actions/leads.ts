"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { writeAuditLog } from "@/lib/audit";
import { requireAdmin } from "@/lib/admin-session";
import { prisma } from "@/lib/prisma";

export type NewLeadStatus =
  | "submitted"
  | "in_review"
  | "contacted"
  | "enrolled"
  | "disqualified"
  | "closed";

const statusSchema = z.enum([
  "submitted",
  "in_review",
  "contacted",
  "enrolled",
  "disqualified",
  "closed",
]);

const updateSchema = z.object({
  id: z.string().min(1),
  status: statusSchema,
  note: z.string().max(1000).optional().nullable(),
});

export type LeadActionState = {
  error?: string;
  ok?: boolean;
  applicationCreated?: boolean;
  warn?: string;
};

/**
 * Server Action (FormData 版) — admin 表单提交用
 */
export async function updateLeadStatus(
  _prev: LeadActionState,
  formData: FormData,
): Promise<LeadActionState> {
  const session = await requireAdmin();
  const parsed = updateSchema.safeParse({
    id: formData.get("id"),
    status: formData.get("status"),
    note: formData.get("note") ?? null,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "参数错误" };
  }

  return _doUpdateLeadStatus(
    session,
    parsed.data.id,
    parsed.data.status,
    parsed.data.note ?? undefined,
  );
}

/**
 * Server Action (直接调用版) — admin-engineer 组件 / 其他 action 调用用
 *
 * updateLeadStatus(leadId, nextStatus, note?)
 * 返回 { ok: true, applicationCreated?: boolean } | { ok: false, error: string }
 */
export async function setLeadStatus(
  leadId: string,
  nextStatus: string,
  note?: string,
): Promise<LeadActionState> {
  const session = await requireAdmin();
  const parsedStatus = statusSchema.safeParse(nextStatus);
  if (!parsedStatus.success) return { error: "状态不合法" };

  return _doUpdateLeadStatus(session, leadId, parsedStatus.data, note);
}

async function _doUpdateLeadStatus(
  session: Awaited<ReturnType<typeof requireAdmin>>,
  leadId: string,
  nextStatus: NewLeadStatus,
  note?: string,
): Promise<LeadActionState> {
  const before = await prisma.lead.findUnique({
    where: { id: leadId },
    select: {
      id: true,
      name: true,
      status: true,
      note: true,
      userId: true,
      trialId: true,
      trial: { select: { title: true } },
    },
  });
  if (!before) return { error: "线索不存在" };

  await prisma.lead.update({
    where: { id: leadId },
    data: {
      status: nextStatus,
      ...(note !== undefined ? { note } : {}),
      statusChangedAt: new Date(),
      statusChangedBy: session.operatorId,
    },
  });

  const statusChanged = before.status !== nextStatus;

  // 若状态推进到 enrolled，同步 Application
  let applicationCreated = false;
  let warn: string | undefined;

  if (nextStatus === "enrolled") {
    if (!before.userId) {
      warn = "Lead.userId 为空，跳过 Application 同步";
    } else {
      const now = new Date();
      const existing = await prisma.application.findUnique({
        where: { leadId },
      });
      if (existing) {
        await prisma.application.update({
          where: { leadId },
          data: { stage: "enrolled", stageChangedAt: now },
        });
      } else {
        await prisma.application.create({
          data: {
            userId: before.userId,
            trialId: before.trialId,
            leadId,
            stage: "enrolled",
            stageChangedAt: now,
          },
        });
        applicationCreated = true;
      }
    }
  }

  await writeAuditLog({
    session,
    action: statusChanged ? "update_lead_status" : "lead.note.update",
    entityType: "Lead",
    entityId: before.id,
    summary: statusChanged
      ? `线索 #${before.id.slice(-6)} 状态 ${before.status} → ${nextStatus}`
      : `更新线索备注: ${before.name}`,
    detail: {
      trialTitle: before.trial.title,
      before: { status: before.status, note: before.note },
      after: { status: nextStatus, note: note ?? null },
      applicationCreated,
    },
  });

  revalidatePath("/admin/leads");
  revalidatePath(`/admin/leads/${leadId}`);

  return { ok: true, applicationCreated, ...(warn ? { warn } : {}) };
}
