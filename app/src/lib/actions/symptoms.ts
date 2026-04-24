"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUserSession, isLoggedIn } from "@/lib/user-session";
import { analyzeSymptoms, type DiseaseTag } from "@/lib/disease-matcher";

const symptomsTextSchema = z
  .string()
  .trim()
  .min(10, "症状描述至少 10 个字")
  .max(500, "症状描述不超过 500 字");

export type AnalyzeSymptomsResult =
  | { ok: true; tags: DiseaseTag[] }
  | { ok: false; error: string };

export async function analyzeSymptomsAction(
  text: string,
): Promise<AnalyzeSymptomsResult> {
  const session = await getUserSession();
  if (!isLoggedIn(session)) {
    return { ok: false, error: "未登录" };
  }
  const parsed = symptomsTextSchema.safeParse(text);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "校验失败" };
  }
  const tags = await analyzeSymptoms(parsed.data);
  return { ok: true, tags };
}

const saveSchema = z.object({
  symptomsText: symptomsTextSchema,
  aiDiseaseTags: z.string().optional(),
});

export type SaveSymptomsState = { ok?: boolean; error?: string };

export async function saveSymptomsAction(
  _prev: SaveSymptomsState,
  fd: FormData,
): Promise<SaveSymptomsState> {
  const session = await getUserSession();
  if (!isLoggedIn(session)) {
    return { error: "未登录" };
  }

  const parsed = saveSchema.safeParse({
    symptomsText: fd.get("symptomsText"),
    aiDiseaseTags: fd.get("aiDiseaseTags") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "校验失败" };
  }

  await prisma.user.update({
    where: { id: session.userId },
    data: {
      symptomsText: parsed.data.symptomsText,
      aiDiseaseTags: parsed.data.aiDiseaseTags ?? null,
      symptomsUpdatedAt: new Date(),
    },
  });

  await prisma.auditLog.create({
    data: {
      operatorId: session.userId,
      operatorUsername: session.phone,
      operatorDisplayName: session.displayName ?? null,
      operatorRole: "user",
      action: "user.symptoms.update",
      entityType: "user",
      entityId: session.userId,
      summary: `用户更新症状描述（${parsed.data.symptomsText.slice(0, 20)}）`,
      detailJson: null,
    },
  });

  revalidatePath("/me");
  revalidatePath("/auth/register/symptoms");

  redirect("/auth/register/records");
}

export async function skipSymptomsAction(): Promise<never> {
  const session = await getUserSession();
  if (isLoggedIn(session)) {
    await prisma.auditLog.create({
      data: {
        operatorId: session.userId,
        operatorUsername: session.phone,
        operatorDisplayName: session.displayName ?? null,
        operatorRole: "user",
        action: "user.symptoms.skip",
        entityType: "user",
        entityId: session.userId,
        summary: "用户跳过症状填写",
        detailJson: null,
      },
    });
  }
  redirect("/auth/register/records");
}
