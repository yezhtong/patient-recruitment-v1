/**
 * 幂等迁移：Lead.status 旧值 → 新 6 档状态
 * 跑法（从 app/ 目录）：npx tsx scripts/migrate-lead-status.ts
 */

import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";

const url = process.env.DATABASE_URL ?? "file:./dev.db";

const adapter = new PrismaBetterSqlite3({ url });
const prisma = new PrismaClient({ adapter } as never);

const STATUS_MAP: Record<string, string> = {
  new: "submitted",
  contacted: "contacted",
  qualified: "contacted",
  disqualified: "disqualified",
};

const NEW_VALID = new Set([
  "submitted",
  "in_review",
  "contacted",
  "enrolled",
  "disqualified",
  "closed",
]);

async function main() {
  const leads = await prisma.lead.findMany({
    select: { id: true, status: true, name: true },
  });

  console.info(`[migrate-lead-status] 读到 ${leads.length} 条 Lead`);

  let changed = 0;
  let skipped = 0;

  for (const lead of leads) {
    if (NEW_VALID.has(lead.status)) {
      skipped++;
      continue;
    }
    const nextStatus = STATUS_MAP[lead.status] ?? "submitted";
    await prisma.lead.update({
      where: { id: lead.id },
      data: { status: nextStatus },
    });
    await prisma.auditLog.create({
      data: {
        operatorUsername: "system",
        action: "migrate_lead_status",
        entityType: "Lead",
        entityId: lead.id,
        summary: `迁移线索状态: ${lead.status} → ${nextStatus}`,
        detailJson: JSON.stringify({ before: lead.status, after: nextStatus }),
      },
    });
    changed++;
  }

  console.info(
    `[migrate-lead-status] 完成 — 更新 ${changed} 条，跳过（已是新状态）${skipped} 条`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
