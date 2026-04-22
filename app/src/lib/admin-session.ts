import { cookies } from "next/headers";
import { getIronSession, type SessionOptions } from "iron-session";

export interface AdminSessionData {
  operatorId?: string;
  username?: string;
  role?: "operator" | "admin";
  displayName?: string;
}

const sessionPassword =
  process.env.SESSION_PASSWORD ??
  "dev-only-super-secret-session-password-32chars-minimum-abc123";

export const adminSessionOptions: SessionOptions = {
  password: sessionPassword,
  cookieName: "jt_admin_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8, // 8 小时
  },
};

export async function getAdminSession() {
  const cookieStore = await cookies();
  return getIronSession<AdminSessionData>(cookieStore, adminSessionOptions);
}

export async function requireAdmin() {
  const session = await getAdminSession();
  if (!session.operatorId) {
    throw new Error("UNAUTHENTICATED");
  }
  return session;
}

export async function requireAdminRole() {
  const session = await requireAdmin();
  if (session.role !== "admin") {
    throw new Error("FORBIDDEN");
  }
  return session;
}

export function isAdminSession(
  s: AdminSessionData,
): s is Required<Pick<AdminSessionData, "operatorId" | "username" | "role" | "displayName">> {
  return Boolean(s.operatorId && s.username && s.role && s.displayName);
}
