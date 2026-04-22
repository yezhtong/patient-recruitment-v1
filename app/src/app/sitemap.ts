import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [trials, groups, posts] = await Promise.all([
    prisma.clinicalTrial.findMany({
      where: { isPublic: true },
      select: { slug: true, updatedAt: true },
    }),
    prisma.communityGroup.findMany({
      where: { isEnabled: true },
      select: { slug: true, updatedAt: true },
    }),
    prisma.communityPost.findMany({
      where: { reviewStatus: { in: ["approved", "featured"] } },
      select: { id: true, updatedAt: true },
      take: 500,
    }),
  ]);

  const staticPaths: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, priority: 1, changeFrequency: "daily" },
    { url: `${SITE_URL}/trials`, priority: 0.9, changeFrequency: "daily" },
    { url: `${SITE_URL}/community`, priority: 0.7, changeFrequency: "daily" },
    { url: `${SITE_URL}/faq`, priority: 0.7, changeFrequency: "weekly" },
    { url: `${SITE_URL}/about`, priority: 0.6, changeFrequency: "monthly" },
    { url: `${SITE_URL}/contact`, priority: 0.5, changeFrequency: "monthly" },
  ];

  const trialPaths: MetadataRoute.Sitemap = trials.map((t) => ({
    url: `${SITE_URL}/trials/${t.slug}`,
    lastModified: t.updatedAt,
    priority: 0.8,
    changeFrequency: "weekly",
  }));
  const groupPaths: MetadataRoute.Sitemap = groups.map((g) => ({
    url: `${SITE_URL}/community/${g.slug}`,
    lastModified: g.updatedAt,
    priority: 0.6,
    changeFrequency: "daily",
  }));
  const postPaths: MetadataRoute.Sitemap = posts.map((p) => ({
    url: `${SITE_URL}/community/posts/${p.id}`,
    lastModified: p.updatedAt,
    priority: 0.5,
    changeFrequency: "weekly",
  }));

  return [...staticPaths, ...trialPaths, ...groupPaths, ...postPaths];
}
