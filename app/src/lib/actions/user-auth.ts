"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUserSession } from "@/lib/user-session";
import { DEV_FIXED_SMS_CODE, smsProvider } from "@/lib/sms";

const PHONE_RE = /^1[3-9]\d{9}$/;

const phoneSchema = z.object({
  phone: z.string().regex(PHONE_RE, "手机号格式不正确"),
});

const verifySchema = z.object({
  phone: z.string().regex(PHONE_RE, "手机号格式不正确"),
  code: z.string().regex(/^\d{6}$/, "验证码是 6 位数字"),
});

export type SendCodeResult =
  | { ok: true; nextRetryInSec: number }
  | { ok: false; error: string };

/** 发送短信验证码。开发环境恒为 123456，console.info 输出；上线时替换 smsProvider。 */
export async function sendSmsCode(phone: string): Promise<SendCodeResult> {
  const parsed = phoneSchema.safeParse({ phone });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "手机号有误" };
  }

  // 节流：同号 60 秒只能发一次
  const recent = await prisma.smsCode.findFirst({
    where: { phone: parsed.data.phone },
    orderBy: { createdAt: "desc" },
  });
  if (recent) {
    const elapsedSec = (Date.now() - recent.createdAt.getTime()) / 1000;
    if (elapsedSec < 60) {
      return {
        ok: false,
        error: `请等待 ${Math.ceil(60 - elapsedSec)} 秒后重试`,
      };
    }
  }

  const code = DEV_FIXED_SMS_CODE;
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await prisma.smsCode.create({
    data: { phone: parsed.data.phone, code, expiresAt },
  });
  const res = await smsProvider().sendCode(parsed.data.phone, code);
  if (!res.ok) {
    return { ok: false, error: res.message ?? "短信服务暂时不可用" };
  }
  return { ok: true, nextRetryInSec: 60 };
}

export type VerifyCodeResult =
  | { ok: true; userId: string; isNew: boolean }
  | { ok: false; error: string };

/** 校验验证码并登录（如手机号未注册则自动创建账号）。 */
export async function verifySmsCode(
  phone: string,
  code: string,
): Promise<VerifyCodeResult> {
  const parsed = verifySchema.safeParse({ phone, code });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "参数错误" };
  }

  // 开发环境：任意手机号 + 固定码 123456 直接通过，无需事先"获取验证码"。
  const isDevBypass =
    process.env.NODE_ENV !== "production" &&
    parsed.data.code === DEV_FIXED_SMS_CODE;

  if (!isDevBypass) {
    const record = await prisma.smsCode.findFirst({
      where: {
        phone: parsed.data.phone,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });
    if (!record) {
      return { ok: false, error: "验证码已失效，请重新获取" };
    }
    if (record.attempts >= 5) {
      return { ok: false, error: "尝试次数过多，请重新获取验证码" };
    }
    if (record.code !== parsed.data.code) {
      await prisma.smsCode.update({
        where: { id: record.id },
        data: { attempts: record.attempts + 1 },
      });
      return { ok: false, error: "验证码不正确" };
    }

    // 消费验证码
    await prisma.smsCode.update({
      where: { id: record.id },
      data: { consumedAt: new Date() },
    });
  }

  // 查/建 User
  let user = await prisma.user.findUnique({
    where: { phone: parsed.data.phone },
  });
  const isNew = !user;
  if (!user) {
    user = await prisma.user.create({
      data: { phone: parsed.data.phone },
    });
  } else {
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
  }

  // 写 session
  const session = await getUserSession();
  session.userId = user.id;
  session.phone = user.phone;
  session.displayName = user.displayName ?? user.name ?? undefined;
  await session.save();

  revalidatePath("/me");
  revalidatePath("/auth");

  return { ok: true, userId: user.id, isNew };
}

export async function userLogout(): Promise<void> {
  "use server";
  const session = await getUserSession();
  session.destroy();
  revalidatePath("/", "layout");
  redirect("/");
}

const profileSchema = z.object({
  name: z.string().trim().max(50).optional(),
  displayName: z.string().trim().max(50).optional(),
  gender: z.enum(["male", "female"]).optional(),
  age: z.coerce.number().int().min(1).max(120).optional(),
  city: z.string().trim().max(50).optional(),
  condition: z.string().trim().max(100).optional(),
});

export type UpdateProfileState = { ok?: boolean; error?: string };

export async function updateUserProfile(
  _prev: UpdateProfileState,
  fd: FormData,
): Promise<UpdateProfileState> {
  const session = await getUserSession();
  if (!session.userId) return { error: "未登录" };
  const parsed = profileSchema.safeParse({
    name: fd.get("name") || undefined,
    displayName: fd.get("displayName") || undefined,
    gender: fd.get("gender") || undefined,
    age: fd.get("age") || undefined,
    city: fd.get("city") || undefined,
    condition: fd.get("condition") || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "校验失败" };
  }
  await prisma.user.update({
    where: { id: session.userId },
    data: parsed.data,
  });
  revalidatePath("/me");
  return { ok: true };
}
