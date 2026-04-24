import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserSession, isLoggedIn } from "@/lib/user-session";
import { sendMessage } from "@/lib/match-assistant";

export const runtime = "nodejs";

const bodySchema = z.object({
  sessionId: z.string().optional(),
  userMessage: z.string().min(1).max(2000),
});

export async function POST(request: NextRequest) {
  const session = await getUserSession();
  if (!isLoggedIn(session)) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  let body: z.infer<typeof bodySchema>;
  try {
    const json = await request.json();
    body = bodySchema.parse(json);
  } catch (err) {
    return NextResponse.json(
      { error: "参数错误", detail: err instanceof Error ? err.message : String(err) },
      { status: 400 },
    );
  }

  try {
    const result = await sendMessage({
      userId: session.userId,
      sessionId: body.sessionId,
      userMessage: body.userMessage,
    });
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "服务异常", detail: msg }, { status: 500 });
  }
}
