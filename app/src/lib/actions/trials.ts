"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { writeAuditLog } from "@/lib/audit";
import { requireAdminRole } from "@/lib/admin-session";
import { prisma } from "@/lib/prisma";

const trialInputSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(2, "slug 至少 2 字符")
    .max(80)
    .regex(/^[a-z0-9-]+$/, "slug 只允许小写字母、数字与短横"),
  title: z.string().trim().min(2).max(120),
  disease: z.string().trim().min(1).max(60),
  city: z.string().trim().min(1).max(40),
  phase: z.string().trim().max(10).optional().nullable(),
  status: z.enum(["recruiting", "paused", "closed"]),
  isPublic: z.boolean(),
  isFeatured: z.boolean(),
  summary: z.string().trim().min(1).max(500),
  description: z.string().max(5000).optional().nullable(),
  inclusionBrief: z.string().max(2000).optional().nullable(),
  exclusionBrief: z.string().max(2000).optional().nullable(),
  sponsor: z.string().max(120).optional().nullable(),
  intervention: z.string().max(200).optional().nullable(),
  studyDesign: z.string().max(500).optional().nullable(),
  targetEnrollment: z.coerce.number().int().min(0).max(100000).optional().nullable(),
  siteName: z.string().max(200).optional().nullable(),
  siteAddress: z.string().max(300).optional().nullable(),
  contactPerson: z.string().max(60).optional().nullable(),
  contactPhone: z.string().max(30).optional().nullable(),
  benefits: z.string().max(2000).optional().nullable(),
  followUpPlan: z.string().max(2000).optional().nullable(),
  adVersion: z.string().max(20).optional().nullable(),
  adVersionDate: z.string().optional().nullable(),
  ethicsApproval: z.string().max(100).optional().nullable(),
  qrcodeUrl: z.string().url().optional().nullable().or(z.literal("").transform(() => null)),
});

export type TrialFormState = { error?: string; ok?: boolean };

function readTrialForm(formData: FormData) {
  return {
    slug: formData.get("slug"),
    title: formData.get("title"),
    disease: formData.get("disease"),
    city: formData.get("city"),
    phase: formData.get("phase") || null,
    status: formData.get("status"),
    isPublic: formData.get("isPublic") === "on",
    isFeatured: formData.get("isFeatured") === "on",
    summary: formData.get("summary"),
    description: formData.get("description") || null,
    inclusionBrief: formData.get("inclusionBrief") || null,
    exclusionBrief: formData.get("exclusionBrief") || null,
    sponsor: formData.get("sponsor") || null,
    intervention: formData.get("intervention") || null,
    studyDesign: formData.get("studyDesign") || null,
    targetEnrollment: formData.get("targetEnrollment") || null,
    siteName: formData.get("siteName") || null,
    siteAddress: formData.get("siteAddress") || null,
    contactPerson: formData.get("contactPerson") || null,
    contactPhone: formData.get("contactPhone") || null,
    benefits: formData.get("benefits") || null,
    followUpPlan: formData.get("followUpPlan") || null,
    adVersion: formData.get("adVersion") || null,
    adVersionDate: formData.get("adVersionDate") || null,
    ethicsApproval: formData.get("ethicsApproval") || null,
    qrcodeUrl: formData.get("qrcodeUrl") || null,
  };
}

export async function createTrial(
  _prev: TrialFormState,
  formData: FormData,
): Promise<TrialFormState> {
  const session = await requireAdminRole();
  const parsed = trialInputSchema.safeParse(readTrialForm(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "表单校验失败" };
  }
  const data = parsed.data;

  const existing = await prisma.clinicalTrial.findUnique({
    where: { slug: data.slug },
  });
  if (existing) {
    return { error: "slug 已存在，换一个" };
  }

  const created = await prisma.clinicalTrial.create({
    data: {
      ...data,
      adVersionDate: data.adVersionDate ? new Date(data.adVersionDate) : null,
    },
  });

  await writeAuditLog({
    session,
    action: "trial.create",
    entityType: "clinical_trial",
    entityId: created.id,
    summary: `Create trial: ${created.title}`,
    detail: {
      slug: created.slug,
      title: created.title,
      status: created.status,
      city: created.city,
      isPublic: created.isPublic,
    },
  });

  revalidatePath("/admin/trials");
  revalidatePath("/trials");
  revalidatePath("/");
  redirect("/admin/trials");
}

export async function updateTrial(
  id: string,
  _prev: TrialFormState,
  formData: FormData,
): Promise<TrialFormState> {
  const session = await requireAdminRole();
  const parsed = trialInputSchema.safeParse(readTrialForm(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "表单校验失败" };
  }
  const data = parsed.data;

  const other = await prisma.clinicalTrial.findFirst({
    where: { slug: data.slug, NOT: { id } },
    select: { id: true },
  });
  if (other) {
    return { error: "slug 已被其他试验使用" };
  }

  const before = await prisma.clinicalTrial.findUnique({
    where: { id },
    select: {
      id: true,
      slug: true,
      title: true,
      status: true,
      isPublic: true,
      isFeatured: true,
    },
  });

  const updated = await prisma.clinicalTrial.update({
    where: { id },
    data: {
      ...data,
      adVersionDate: data.adVersionDate ? new Date(data.adVersionDate) : null,
    },
  });

  await writeAuditLog({
    session,
    action: "trial.update",
    entityType: "clinical_trial",
    entityId: updated.id,
    summary: `Update trial: ${updated.title}`,
    detail: {
      before,
      after: {
        slug: updated.slug,
        title: updated.title,
        status: updated.status,
        isPublic: updated.isPublic,
        isFeatured: updated.isFeatured,
      },
    },
  });

  revalidatePath("/admin/trials");
  revalidatePath(`/admin/trials/${id}/edit`);
  revalidatePath(`/trials/${data.slug}`);
  revalidatePath("/trials");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteTrial(id: string): Promise<void> {
  const session = await requireAdminRole();
  const trial = await prisma.clinicalTrial.findUnique({
    where: { id },
    select: { id: true, slug: true, title: true, status: true },
  });
  await prisma.clinicalTrial.delete({ where: { id } });
  if (trial) {
    await writeAuditLog({
      session,
      action: "trial.delete",
      entityType: "clinical_trial",
      entityId: trial.id,
      summary: `Delete trial: ${trial.title}`,
      detail: trial,
    });
  }
  revalidatePath("/admin/trials");
  revalidatePath("/trials");
  revalidatePath("/");
  redirect("/admin/trials");
}
