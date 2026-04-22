import type { AdminSessionData } from "@/lib/admin-session";
import { prisma } from "@/lib/prisma";

export async function writeAuditLog(input: {
  session: AdminSessionData;
  action: string;
  entityType: string;
  entityId?: string | null;
  summary: string;
  detail?: unknown;
}) {
  await prisma.auditLog.create({
    data: {
      operatorId: input.session.operatorId ?? null,
      operatorUsername: input.session.username ?? null,
      operatorDisplayName: input.session.displayName ?? null,
      operatorRole: input.session.role ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      summary: input.summary,
      detailJson:
        input.detail === undefined ? null : JSON.stringify(input.detail),
    },
  });
}
