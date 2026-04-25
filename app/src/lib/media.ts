import { prisma } from "@/lib/prisma";
import type { MediaAsset } from "@/generated/prisma/client";

export type MediaCategory = "hero" | "community" | "trial" | "faq" | "avatar" | "step";

export async function getLatestMedia(
  category: MediaCategory,
): Promise<MediaAsset | null> {
  return prisma.mediaAsset.findFirst({
    where: { category, isEnabled: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getMediaList(
  category: MediaCategory,
  limit = 10,
): Promise<MediaAsset[]> {
  return prisma.mediaAsset.findMany({
    where: { category, isEnabled: true },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getHeroSlides(max = 5): Promise<MediaAsset[]> {
  return prisma.mediaAsset.findMany({
    where: { category: "hero", isEnabled: true },
    orderBy: { createdAt: "desc" },
    take: max,
  });
}

// M8.5 新增：根据 id 查单条 MediaAsset（用于弱关联消费）
export async function getMediaById(id: string | null | undefined): Promise<MediaAsset | null> {
  if (!id) return null;
  return prisma.mediaAsset.findFirst({
    where: { id, isEnabled: true },
  });
}

// M8.5 新增：FAQ 站点级 hero 图（取 faq 分类最新 1 张）
export async function getLatestFaqHero(): Promise<MediaAsset | null> {
  return prisma.mediaAsset.findFirst({
    where: { category: "faq", isEnabled: true },
    orderBy: { createdAt: "desc" },
  });
}

// M8.5 新增：6 色哈希函数 · 给试验顶图无图时降级用
// 返回 0-5，对应 styles.css 里的 .trial-cover--color-0 ~ .trial-cover--color-5
export function getDiseaseColorClass(disease: string | null | undefined): number {
  if (!disease) return 0;
  let hash = 0;
  for (let i = 0; i < disease.length; i++) {
    hash = ((hash << 5) - hash) + disease.charCodeAt(i);
    hash = hash & hash; // 转 32 位整数
  }
  return Math.abs(hash) % 6;
}
