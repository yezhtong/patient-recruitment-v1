"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { getAdminSession } from "@/lib/admin-session";
import { writeAuditLog } from "@/lib/audit";

const loginSchema = z.object({
  username: z.string().trim().min(1).max(50),
  password: z.string().min(1).max(200),
});

export type AdminLoginState = {
  error?: string;
};

export async function adminLogin(
  _prev: AdminLoginState,
  formData: FormData,
): Promise<AdminLoginState> {
  const parsed = loginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: "请输入用户名和密码" };
  }

  const user = await prisma.operatorUser.findUnique({
    where: { username: parsed.data.username },
  });
  if (!user || user.status !== "active") {
    return { error: "账号不存在或已停用" };
  }
  if (!verifyPassword(parsed.data.password, user.passwordHash)) {
    return { error: "用户名或密码错误" };
  }

  const session = await getAdminSession();
  session.operatorId = user.id;
  session.username = user.username;
  session.role = user.role as "operator" | "admin";
  session.displayName = user.displayName;
  await session.save();

  await prisma.operatorUser.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  await writeAuditLog({
    session: {
      operatorId: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role as "operator" | "admin",
    },
    action: "auth.login",
    entityType: "operator_user",
    entityId: user.id,
    summary: `后台账号 ${user.username} 登录`,
    detail: {
      username: user.username,
      role: user.role,
    },
  });

  redirect("/admin");
}

export async function adminLogout(): Promise<void> {
  const session = await getAdminSession();
  if (
    session.operatorId &&
    session.username &&
    session.displayName &&
    session.role
  ) {
    await writeAuditLog({
      session: {
        operatorId: session.operatorId,
        username: session.username,
        displayName: session.displayName,
        role: session.role,
      },
      action: "auth.logout",
      entityType: "operator_user",
      entityId: session.operatorId,
      summary: `后台账号 ${session.username} 退出登录`,
      detail: {
        username: session.username,
        role: session.role,
      },
    });
  }
  session.destroy();
  redirect("/admin/login");
}
