import { NextResponse, type NextRequest } from "next/server";

/**
 * M8.1 · 统一路由守卫 / cookie 初始化
 *
 * 职责：
 * 1. 为游客初始化 jt_guest_token cookie（UUID，30 天）——
 *    server component 不能写 cookie（Next 15+ 限制），因此在 middleware 层预写。
 *    server component 只需 readGuestToken() 读取即可。
 *
 * 不做：
 * - 被封用户重定向（middleware 无法访问 Prisma，由各 server component 显式调 requireNotLocked）
 */

const GUEST_COOKIE = "jt_guest_token";
const GUEST_MAX_AGE = 60 * 60 * 24 * 30; // 30 天

function makeUuid(): string {
  // Web Crypto，edge runtime 可用
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // fallback: 伪 UUID
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}-${Math.random()
    .toString(16)
    .slice(2, 10)}`;
}

export function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const existing = req.cookies.get(GUEST_COOKIE)?.value;
  if (!existing || existing.length < 10) {
    const token = makeUuid();
    res.cookies.set({
      name: GUEST_COOKIE,
      value: token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: GUEST_MAX_AGE,
    });
  }
  return res;
}

/**
 * 只对需要游客 token 的路径生效；不干扰 API / 静态资源 / next 内部。
 * 目前只有 /trials/* 用到 cookie，但把根路径也纳入以便后续扩展。
 */
export const config = {
  matcher: [
    /*
     * 匹配除以下前缀外的所有路径：
     * - /api (API routes)
     * - /_next/static, /_next/image
     * - /favicon.ico
     * - /robots.txt, /sitemap.xml
     * - /media (上传的图片资源)
     */
    "/((?!api|_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml|media).*)",
  ],
};
