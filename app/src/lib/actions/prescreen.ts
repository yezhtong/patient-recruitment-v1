"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUserSession, isLoggedIn } from "@/lib/user-session";

const PHONE_RE = /^1[3-9]\d{9}$/;

const submitLeadSchema = z.object({
  trialSlug: z.string().min(1),
  name: z.string().trim().min(1, "请填写姓名").max(50),
  phone: z.string().regex(PHONE_RE, "手机号格式不正确"),
  gender: z.enum(["male", "female"]).optional(),
  age: z.coerce.number().int().min(1).max(120).optional(),
  city: z.string().trim().max(50).optional(),
  condition: z.string().trim().max(100).optional(),
  projectAnswers: z.record(z.string(), z.unknown()).optional(),
  agreePrivacy: z.boolean(),
  agreeReuse: z.boolean().optional(),
  sourcePage: z.string().max(200).optional(),
  sourcePostId: z.string().max(50).optional(),
});

export type SubmitLeadInput = z.input<typeof submitLeadSchema>;

export type SubmitLeadResult =
  | { ok: true; leadId: string }
  | { ok: false; error: string };

export async function submitLead(
  input: SubmitLeadInput,
): Promise<SubmitLeadResult> {
  // 强制登录校验
  const session = await getUserSession();
  if (!isLoggedIn(session)) {
    return { ok: false, error: "NOT_AUTHENTICATED" };
  }
  const userId = session.userId;

  const parsed = submitLeadSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: first?.message ?? "提交内容有误" };
  }
  const data = parsed.data;

  if (!data.agreePrivacy) {
    return { ok: false, error: "请先勾选同意隐私政策与用户协议" };
  }

  const trial = await prisma.clinicalTrial.findUnique({
    where: { slug: data.trialSlug },
    select: { id: true, status: true, isPublic: true },
  });
  if (!trial || !trial.isPublic || trial.status === "closed") {
    return { ok: false, error: "项目不存在或已关闭招募" };
  }

  // 从 DB 读取用户已有资料，DB 值优先；若 DB 无值则接受表单值并回写 User
  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, phone: true, gender: true, age: true, city: true, condition: true },
  });

  const finalName = dbUser?.name || data.name;
  const finalPhone = dbUser?.phone || data.phone;
  const finalGender = (dbUser?.gender as "male" | "female" | undefined) ?? data.gender;
  const finalAge = dbUser?.age ?? data.age;
  const finalCity = dbUser?.city || data.city;
  const finalCondition = dbUser?.condition || data.condition;

  // 若 DB 中有缺失字段，用表单值回写（补全用户资料）
  const profilePatch: Record<string, unknown> = {};
  if (!dbUser?.name && data.name) profilePatch.name = data.name;
  if (!dbUser?.gender && data.gender) profilePatch.gender = data.gender;
  if (!dbUser?.age && data.age) profilePatch.age = data.age;
  if (!dbUser?.city && data.city) profilePatch.city = data.city;
  if (!dbUser?.condition && data.condition) profilePatch.condition = data.condition;
  profilePatch.agreeReuse = data.agreeReuse ?? false;

  await prisma.user.update({
    where: { id: userId },
    data: profilePatch,
  });

  const lead = await prisma.lead.create({
    data: {
      trialId: trial.id,
      userId,
      name: finalName,
      phone: finalPhone,
      gender: finalGender,
      age: finalAge,
      city: finalCity,
      condition: finalCondition,
      projectAnswers: data.projectAnswers
        ? JSON.stringify(data.projectAnswers)
        : null,
      agreePrivacy: data.agreePrivacy,
      agreeReuse: data.agreeReuse ?? false,
      sourcePage: data.sourcePage ?? `/prescreen/${data.trialSlug}`,
      sourcePostId: data.sourcePostId,
      status: "submitted",
    },
  });

  await prisma.application.create({
    data: {
      userId,
      trialId: trial.id,
      leadId: lead.id,
      stage: "submitted",
      nextAction: "运营将在 24 小时内与你联系确认信息",
    },
  });
  revalidatePath("/me");

  return { ok: true, leadId: lead.id };
}
