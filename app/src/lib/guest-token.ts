import { cookies } from "next/headers";

export const GUEST_TOKEN_COOKIE = "jt_guest_token";

/**
 * M8.1 · 读取游客 token（已由 middleware 确保 cookie 存在）。
 * Server component 不能直接写 cookie（Next 15+ 限制），所以创建逻辑放在 middleware。
 * 这里只做读取；若 middleware 还没跑到（极端竞态），返回 undefined，调用方应容忍。
 */
export async function readGuestToken(): Promise<string | undefined> {
  const store = await cookies();
  const val = store.get(GUEST_TOKEN_COOKIE)?.value;
  if (!val || val.length < 10) return undefined;
  return val;
}
