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
