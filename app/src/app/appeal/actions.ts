"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUserSession, isLoggedIn } from "@/lib/user-session";

const AppealSchema = z.object({
  phoneSuffix: z
    .string()
    .regex(/^\d{4}$/, "手机号后 4 位需为 4 位数字"),
  appealText: z
    .string()
    .trim()
    .min(5, "请至少填写 5 个字说清楚情况")
    .max(200, "申诉理由不能超过 200 字"),
  agreed: z.literal("on", {
    message: "请阅读并同意协议后再提交",
  }),
});

export type AppealFormState =
  | { status: "idle" }
  | { status: "error"; message: string };

export async function submitAppeal(
  _prev: AppealFormState,
  formData: FormData,
): Promise<AppealFormState> {
  const session = await getUserSession();
  if (!isLoggedIn(session)) {
    redirect("/auth?next=/appeal");
  }

  const parsed = AppealSchema.safeParse({
    phoneSuffix: formData.get("phoneSuffix"),
    appealText: formData.get("appealText"),
    agreed: formData.get("agreed"),
  });

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { status: "error", message: first?.message ?? "表单填写有误" };
  }

  const lock = await prisma.accountLock.findUnique({
    where: { userId: session.userId },
  });
  if (!lock) {
    return {
      status: "error",
      message: "没有找到你的封锁记录，无需申诉",
    };
  }
  if (lock.unlockedAt) {
    return {
      status: "error",
      message: "你的账号已经恢复访问，无需申诉",
    };
  }
  if (lock.appealStatus !== "none") {
    return {
      status: "error",
      message: "你已经提交过申诉，请耐心等待运营处理",
    };
  }

  // 身份校验：手机号后 4 位
  if (session.phone.slice(-4) !== parsed.data.phoneSuffix) {
    return {
      status: "error",
      message: "这 4 位和你注册时用的手机号对不上",
    };
  }

  await prisma.accountLock.update({
    where: { userId: session.userId },
    data: {
      appealText: parsed.data.appealText,
      appealedAt: new Date(),
      appealStatus: "pending",
    },
  });

  revalidatePath("/account-locked");
  revalidatePath("/appeal");
  redirect("/appeal/submitted");
}
