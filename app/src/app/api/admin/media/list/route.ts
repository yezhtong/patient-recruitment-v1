import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "UNAUTHORIZED";
    if (msg === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }
    return NextResponse.json({ error: "无权访问" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category")?.trim();

  if (!category) {
    return NextResponse.json(
      { error: "category 参数必填" },
      { status: 400 },
    );
  }

  try {
    const items = await prisma.mediaAsset.findMany({
      where: { category, isEnabled: true },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        url: true,
        category: true,
        note: true,
        originalName: true,
        sizeBytes: true,
        mimeType: true,
        width: true,
        height: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ items });
  } catch {
    // picker 容错：5xx 时返回空列表，不抛错
    return NextResponse.json({ items: [] }, { status: 200 });
  }
}
