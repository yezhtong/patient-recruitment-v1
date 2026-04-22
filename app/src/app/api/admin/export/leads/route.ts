import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/admin-session";
import { writeAuditLog } from "@/lib/audit";
import { csvDateTime, csvTimestamp, toCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  let session;
  try {
    session = await requireAdminRole();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "UNAUTHORIZED";
    if (msg === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    return NextResponse.json({ error: "仅 admin 可导出线索" }, { status: 403 });
  }

  const url = new URL(request.url);
  const status = url.searchParams.get("status")?.trim() ?? "";
  const trialSlug = url.searchParams.get("trial")?.trim() ?? "";
  const q = url.searchParams.get("q")?.trim() ?? "";

  const where: {
    status?: string;
    trialId?: string;
    OR?: Array<{ name?: { contains: string }; phone?: { contains: string } }>;
  } = {};
  if (status) where.status = status;
  if (trialSlug) {
    const trial = await prisma.clinicalTrial.findUnique({ where: { slug: trialSlug }, select: { id: true } });
    if (trial) where.trialId = trial.id;
  }
  if (q) where.OR = [{ name: { contains: q } }, { phone: { contains: q } }];

  const totalCount = await prisma.lead.count({ where });
  const leads = await prisma.lead.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50000,
    include: {
      trial: { select: { slug: true, title: true, disease: true, city: true } },
    },
  });

  const headers = [
    "提交时间",
    "姓名",
    "手机号",
    "性别",
    "年龄",
    "城市",
    "病史",
    "试验标题",
    "试验slug",
    "试验病种",
    "试验城市",
    "状态",
    "备注",
    "来源页",
    "同意复用",
    "更新时间",
  ];
  const rows = leads.map((l) => [
    csvDateTime(l.createdAt),
    l.name,
    l.phone,
    l.gender ?? "",
    l.age ?? "",
    l.city ?? "",
    l.condition ?? "",
    l.trial.title,
    l.trial.slug,
    l.trial.disease,
    l.trial.city,
    l.status,
    l.note ?? "",
    l.sourcePage ?? "",
    l.agreeReuse ? "是" : "否",
    csvDateTime(l.updatedAt),
  ]);

  const csv = toCsv(headers, rows);

  await writeAuditLog({
    session,
    action: "export",
    entityType: "lead",
    summary: `导出线索 ${leads.length} 条`,
    detail: { status, trialSlug, q, totalCount, exportedCount: leads.length },
  });

  const filename = `leads-${csvTimestamp()}.csv`;
  const responseHeaders: Record<string, string> = {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Cache-Control": "no-store",
  };
  if (totalCount > 50000) {
    responseHeaders["X-Export-Truncated"] = `true; total=${totalCount}; exported=50000`;
  }
  return new NextResponse(csv, { status: 200, headers: responseHeaders });
}
