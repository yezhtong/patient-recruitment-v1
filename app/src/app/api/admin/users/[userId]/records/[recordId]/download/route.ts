import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-session";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ userId: string; recordId: string }> },
) {
  let session;
  try {
    session = await requireAdmin();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    return NextResponse.json({ error: "无权访问" }, { status: 403 });
  }
  const { userId, recordId } = await context.params;
  const record = await prisma.userMedicalRecord.findUnique({ where: { id: recordId } });
  if (!record || record.userId !== userId) {
    return NextResponse.json({ error: "记录不存在" }, { status: 404 });
  }

  await prisma.auditLog.create({
    data: {
      operatorId: session.operatorId ?? null,
      operatorRole: session.role,
      action: "admin.medical_record.view",
      entityType: "user_medical_record",
      entityId: record.id,
      summary: `管理员下载用户确诊记录 ${record.originalName}`,
    },
  });

  const abs = path.join(process.cwd(), "public", record.url.replace(/^\//, ""));
  try {
    const buf = await readFile(abs);
    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": record.mimeType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(record.originalName)}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "文件读取失败" }, { status: 500 });
  }
}
