"use server";

import { revalidatePath } from "next/cache";
import { requireAdminRole } from "@/lib/admin-session";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

export async function assignDoctorRole(
  userId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await requireAdminRole();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, phone: true, displayName: true, isSystemAi: true, role: true },
  });
  if (!user) return { ok: false, error: "用户不存在" };
  if (user.isSystemAi) return { ok: false, error: "AI 账号不可变更" };

  await prisma.user.update({ where: { id: userId }, data: { role: "doctor" } });

  await writeAuditLog({
    session,
    action: "user.role.assign_doctor",
    entityType: "user",
    entityId: userId,
    summary: `将用户 ${user.phone}（${user.displayName ?? "未命名"}）设为医生`,
    detail: { prevRole: user.role },
  });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
  return { ok: true };
}

export async function revokeDoctorRole(
  userId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await requireAdminRole();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, phone: true, displayName: true, isSystemAi: true, role: true },
  });
  if (!user) return { ok: false, error: "用户不存在" };
  if (user.isSystemAi) return { ok: false, error: "AI 账号不可变更" };

  await prisma.user.update({ where: { id: userId }, data: { role: "patient" } });

  await writeAuditLog({
    session,
    action: "user.role.revoke_doctor",
    entityType: "user",
    entityId: userId,
    summary: `撤销用户 ${user.phone}（${user.displayName ?? "未命名"}）的医生身份`,
    detail: { prevRole: user.role },
  });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
  return { ok: true };
}
