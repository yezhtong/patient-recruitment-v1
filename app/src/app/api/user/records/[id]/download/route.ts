import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { getUserSession, isLoggedIn } from "@/lib/user-session";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getUserSession();
  if (!isLoggedIn(session)) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { id } = await context.params;
  const record = await prisma.userMedicalRecord.findUnique({ where: { id } });
  if (!record || record.deletedAt) {
    return NextResponse.json({ error: "记录不存在" }, { status: 404 });
  }
  if (record.userId !== session.userId) {
    return NextResponse.json({ error: "无权访问" }, { status: 403 });
  }

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
