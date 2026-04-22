import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";

const GROUPS = [
  {
    slug: "hypertension-resistant",
    name: "难治性高血压",
    diseaseTag: "难治性高血压",
    introduction:
      "「难治性」不是绝境，而是需要特别方案。这里分享 RDN 手术、用药副作用、血压管理的真实经历。",
    sortOrder: 10,
  },
  {
    slug: "forehead-wrinkle",
    name: "额头纹（医美）",
    diseaseTag: "额部动力性皱纹",
    introduction:
      "注射类医美临床研究的病友社区。治疗体验、随访安排、效果观察可以在这里分享。",
    sortOrder: 20,
  },
  {
    slug: "solid-tumor",
    name: "恶性实体肿瘤",
    diseaseTag: "恶性实体肿瘤",
    introduction:
      "肿瘤患者及家属的互助空间。放疗、化疗、靶向、免疫治疗相关经验都可以在这里交流。",
    sortOrder: 30,
  },
  {
    slug: "diabetes-t2",
    name: "2 型糖尿病",
    diseaseTag: "2 型糖尿病",
    introduction: "GLP-1、胰岛素、口服药、生活方式干预——和病友一起讨论哪些真的管用。",
    sortOrder: 40,
  },
  {
    slug: "breast-cancer",
    name: "乳腺癌",
    diseaseTag: "乳腺癌",
    introduction: "HER2 靶向、CDK4/6、内分泌治疗……新的希望层出不穷。分享你的治疗旅程。",
    sortOrder: 50,
  },
  {
    slug: "general",
    name: "综合讨论",
    diseaseTag: null,
    introduction: "不针对特定病种的讨论：临床试验流程、知情同意、费用、隐私等通用话题。",
    sortOrder: 100,
  },
];

async function main() {
  const dbUrl = process.env.DATABASE_URL ?? (process.env.NODE_ENV === "production"
    ? (() => { throw new Error("DATABASE_URL is required in production"); })()
    : "file:./dev.db");
  const adapter = new PrismaBetterSqlite3({ url: dbUrl });
  const prisma = new PrismaClient({ adapter });

  for (const g of GROUPS) {
    await prisma.communityGroup.upsert({
      where: { slug: g.slug },
      update: g,
      create: g,
    });
  }

  // 种子一条官方精选帖子（绑定难治性高血压社区 + 射频消融试验）
  const rdnTrial = await prisma.clinicalTrial.findUnique({
    where: { slug: "rdn-hypertension-beijing-2025" },
  });
  const rdnGroup = await prisma.communityGroup.findUnique({
    where: { slug: "hypertension-resistant" },
  });
  if (rdnGroup && rdnTrial) {
    await prisma.communityPost.upsert({
      where: { id: "seed-post-rdn-intro" },
      update: {},
      create: {
        id: "seed-post-rdn-intro",
        groupId: rdnGroup.id,
        authorRole: "operator",
        isAnonymous: false,
        title: "写给第一次考虑 RDN 手术的你：我们整理了 8 个患者最常问的问题",
        content:
          "这条帖子由运营整理，基于北京安贞医院 RDN 项目患者在咨询电话中最常问的 8 个问题。\n\n" +
          "1. 手术是全麻还是局麻？——局部麻醉为主，整个过程约 1 小时。\n" +
          "2. 术后多久可以出院？——观察 2-3 天无异常即可出院。\n" +
          "3. 需要停原来的降压药吗？——不要自行停药。研究医生会根据血压监测逐步调整。\n" +
          "4. 会不会影响肾功能？——研究入组前后会做 eGFR 监测，这本身就是研究重点。\n" +
          "5. 手术免费吗？——研究器械、手术、相关检查、随访交通补助都由项目方承担。\n" +
          "6. 随访要跑多少次？——术后 7 天 / 1 / 3 / 6 / 12 / 24 / 36 个月，每次半天。\n" +
          "7. 不在北京怎么办？——该研究为多中心，可以问运营就近中心。\n" +
          "8. 退出后会被『记一笔』吗？——不会，这是你的基本权利。\n\n" +
          "任何问题欢迎在本帖下方提问，运营会逐一回复。",
        postType: "experience",
        relatedTrialId: rdnTrial.id,
        reviewStatus: "featured",
        isFeatured: true,
      },
    });
  }

  const groupCount = await prisma.communityGroup.count();
  const postCount = await prisma.communityPost.count();
  console.log(`[seed-community] 分区 ${groupCount} 个，帖子 ${postCount} 条`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
