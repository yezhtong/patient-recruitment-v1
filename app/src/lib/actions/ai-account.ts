"use server";

import { revalidatePath } from "next/cache";
import { requireAdminRole } from "@/lib/admin-session";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

export async function toggleAiTemplate(
  templateId: string,
  enabled: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await requireAdminRole();

  const template = await prisma.aiAccountTemplate.findUnique({
    where: { id: templateId },
    select: { id: true, scenario: true },
  });
  if (!template) return { ok: false, error: "模板不存在" };

  await prisma.aiAccountTemplate.update({
    where: { id: templateId },
    data: { isEnabled: enabled },
  });

  await writeAuditLog({
    session,
    action: "ai_account.template.toggle",
    entityType: "ai_account_template",
    entityId: templateId,
    summary: `${enabled ? "启用" : "停用"} AI 模板 ${template.scenario}`,
    detail: { enabled },
  });

  revalidatePath("/admin/ai-account");
  return { ok: true };
}
