"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { writeAuditLog } from "@/lib/audit";
import { requireAdmin } from "@/lib/admin-session";
import { prisma } from "@/lib/prisma";

const stageSchema = z.enum([
  "submitted",
  "in_review",
  "contacted",
  "enrolled",
  "withdrawn",
  "closed",
]);

export async function setApplicationStage(
  id: string,
  stage:
    | "submitted"
    | "in_review"
    | "contacted"
    | "enrolled"
    | "withdrawn"
    | "closed",
  nextAction?: string,
): Promise<{ ok: boolean; error?: string }> {
  const session = await requireAdmin();
  const parsed = stageSchema.safeParse(stage);
  if (!parsed.success) return { ok: false, error: "阶段不合法" };

  const before = await prisma.application.findUnique({
    where: { id },
    select: {
      id: true,
      stage: true,
      nextAction: true,
      user: { select: { phone: true } },
      trial: { select: { title: true } },
    },
  });

  await prisma.application.update({
    where: { id },
    data: {
      stage: parsed.data,
      stageChangedAt: new Date(),
      nextAction: nextAction ?? undefined,
    },
  });

  if (before) {
    await writeAuditLog({
      session,
      action: "application.stage.update",
      entityType: "application",
      entityId: before.id,
      summary: `Update application stage: ${before.stage} -> ${parsed.data}`,
      detail: {
        patientPhone: before.user.phone,
        trialTitle: before.trial.title,
        beforeStage: before.stage,
        afterStage: parsed.data,
        beforeNextAction: before.nextAction,
        afterNextAction: nextAction ?? null,
      },
    });
  }

  revalidatePath("/admin/applications");
  revalidatePath(`/admin/applications/${id}`);
  revalidatePath("/me");
  return { ok: true };
}

const noteSchema = z.object({
  id: z.string().min(1),
  nextAction: z.string().max(500).optional(),
  note: z.string().max(1000).optional(),
});
export type AppNoteState = { ok?: boolean; error?: string };

export async function saveApplicationNote(
  _prev: AppNoteState,
  fd: FormData,
): Promise<AppNoteState> {
  const session = await requireAdmin();
  const parsed = noteSchema.safeParse({
    id: fd.get("id"),
    nextAction: fd.get("nextAction") ?? undefined,
    note: fd.get("note") ?? undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "校验失败" };

  const before = await prisma.application.findUnique({
    where: { id: parsed.data.id },
    select: {
      id: true,
      nextAction: true,
      note: true,
      user: { select: { phone: true } },
      trial: { select: { title: true } },
    },
  });

  await prisma.application.update({
    where: { id: parsed.data.id },
    data: {
      nextAction: parsed.data.nextAction,
      note: parsed.data.note,
    },
  });

  if (before) {
    await writeAuditLog({
      session,
      action: "application.note.update",
      entityType: "application",
      entityId: before.id,
      summary: "Update application note",
      detail: {
        patientPhone: before.user.phone,
        trialTitle: before.trial.title,
        before: {
          nextAction: before.nextAction,
          note: before.note,
        },
        after: {
          nextAction: parsed.data.nextAction ?? null,
          note: parsed.data.note ?? null,
        },
      },
    });
  }

  revalidatePath(`/admin/applications/${parsed.data.id}`);
  revalidatePath("/me");
  return { ok: true };
}
