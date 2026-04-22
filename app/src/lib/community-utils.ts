import { createHash } from "node:crypto";

/** 根据 userId + groupId 算稳定的 4 位匿名编号，跨分区不可关联。 */
export function anonymousTag(userId: string, groupId: string): string {
  const h = createHash("sha1").update(`${userId}:${groupId}`).digest("hex");
  return `#${h.slice(-4).toUpperCase()}`;
}

/** 简单的相对时间展示 */
export function relativeTime(d: Date): string {
  const diffMs = Date.now() - d.getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return "刚刚";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} 分钟前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} 小时前`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} 天前`;
  return d.toISOString().slice(0, 10);
}
