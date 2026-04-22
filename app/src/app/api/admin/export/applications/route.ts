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
    return NextResponse.json({ error: "仅 admin 可导出报名" }, { status: 403 });
  }

  const url = new URL(request.url);
  const stage = url.searchParams.get("stage")?.trim() ?? "";
  const trialSlug = url.searchParams.get("trial")?.trim() ?? "";
  const q = url.searchParams.get("q")?.trim() ?? "";

  const where: {
    stage?: string;
    trialId?: string;
    user?: { phone?: { contains: string } };
  } = {};
  if (stage) where.stage = stage;
  if (trialSlug) {
    const trial = await prisma.clinicalTrial.findUnique({ where: { slug: trialSlug }, select: { id: true } });
    if (trial) where.trialId = trial.id;
  }
  if (q) where.user = { phone: { contains: q } };

  const totalCount = await prisma.application.count({ where });
  const apps = await prisma.application.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50000,
    include: {
      user: { select: { phone: true, name: true, displayName: true, age: true, gender: true, city: true } },
      trial: { select: { slug: true, title: true, disease: true, city: true } },
      lead: { select: { id: true, createdAt: true, status: true, projectAnswers: true } },
    },
  });

  function summarizeProjectAnswers(raw: string | null | undefined): string {
    if (!raw) return "";
    let parsed: unknown;
    try { parsed = JSON.parse(raw); } catch { return raw.slice(0, 200); }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return "";
    const pairs = Object.entries(parsed as Record<string, unknown>)
      .filter(([, v]) => v !== null && v !== undefined && v !== "")
      .map(([k, v]) => `${k}=${String(v)}`)
      .join("；");
    return pairs.length > 200 ? pairs.slice(0, 200) + "…" : pairs;
  }

  const headers = [
    "提交时间",
    "患者姓名",
    "手机号",
    "性别",
    "年龄",
    "城市",
    "试验标题",
    "试验slug",
    "试验病种",
    "阶段",
    "阶段变更时间",
    "下一步动作",
    "备注",
    "关联leadId",
    "lead创建时间",
    "lead状态",
    "更新时间",
    "项目答案摘要",
  ];
  const rows = apps.map((a) => [
    csvDateTime(a.createdAt),
    a.user.displayName || a.user.name || "",
    a.user.phone,
    a.user.gender ?? "",
    a.user.age ?? "",
    a.user.city ?? "",
    a.trial.title,
    a.trial.slug,
    a.trial.disease,
    a.stage,
    csvDateTime(a.stageChangedAt),
    a.nextAction ?? "",
    a.note ?? "",
    a.lead?.id ?? "",
    csvDateTime(a.lead?.createdAt ?? null),
    a.lead?.status ?? "",
    csvDateTime(a.updatedAt),
    summarizeProjectAnswers(a.lead?.projectAnswers),
  ]);

  const csv = toCsv(headers, rows);

  await writeAuditLog({
    session,
    action: "export",
    entityType: "application",
    summary: `导出报名 ${apps.length} 条`,
    detail: { stage, trialSlug, q, totalCount, exportedCount: apps.length },
  });

  const filename = `applications-${csvTimestamp()}.csv`;
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
