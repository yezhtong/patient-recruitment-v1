import { cookies } from "next/headers";
import { getIronSession, type SessionOptions } from "iron-session";

export interface UserSessionData {
  userId?: string;
  phone?: string;
  displayName?: string;
}

const sessionPassword =
  process.env.SESSION_PASSWORD ??
  "dev-only-super-secret-session-password-32chars-minimum-abc123";

export const userSessionOptions: SessionOptions = {
  password: sessionPassword,
  cookieName: "jt_user_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 天
  },
};

export async function getUserSession() {
  const cookieStore = await cookies();
  return getIronSession<UserSessionData>(cookieStore, userSessionOptions);
}

export function isLoggedIn(s: UserSessionData): s is Required<UserSessionData> {
  return Boolean(s.userId && s.phone);
}
