import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/password";

async function main() {
  const dbUrl = process.env.DATABASE_URL ?? (process.env.NODE_ENV === "production"
    ? (() => { throw new Error("DATABASE_URL is required in production"); })()
    : "file:./dev.db");
  const adapter = new PrismaBetterSqlite3({ url: dbUrl });
  const prisma = new PrismaClient({ adapter });

  // 3 条真实招募广告。字段解析见 真实招募项目/parsed-trials.md
  const trials = [
    {
      slug: "rdn-hypertension-beijing-2025",
      title: "射频消融治疗难治性高血压合并慢性肾病招募",
      disease: "难治性高血压",
      city: "北京",
      phase: null,
      status: "recruiting",
      isPublic: true,
      isFeatured: true,
      summary:
        "18–65 岁难治性高血压合并慢性肾功能不全（eGFR 20–60）患者，免费参与北京安贞医院牵头的全国多中心射频消融治疗研究，含免费器械、检查、手术与交通补助，限 30 名。",
      description:
        "本研究由首都医科大学附属北京安贞医院牵头，在全国多中心开展。研究旨在评估一次性射频消融导管系统（肾动脉去神经术 / RDN）对难治性高血压合并慢性肾功能不全患者的有效性与安全性。",
      inclusionBrief:
        "18–65 周岁（含 65 岁）；服用 ≥2 种降压药后血压仍 ≥140 且 <180；合并慢性肾功能不全（eGFR 20–60 mL/min/1.73m²）。",
      exclusionBrief:
        "血压 ≥180 mmHg；eGFR <20 或 >60；其他排除标准以研究方案为准。",
      sponsor: "首都医科大学附属北京安贞医院（全国多中心牵头单位）",
      intervention: "一次性射频消融导管系统（肾动脉 RDN）",
      studyDesign: "多中心、前瞻性临床研究",
      targetEnrollment: 30,
      siteName: "北京安贞医院通州院区高血压中心一区",
      siteAddress: "北京安贞医院通州院区一号住院楼 5 层",
      contactPerson: "王老师 / 周医生",
      contactPhone: "13810468285",
      benefits:
        "免费试验器械\n免费相关检验检查\n免费射频消融手术\n定期随访交通补助",
      followUpPlan:
        "术后 7 天或出院前\n术后 1 个月\n术后 3 个月\n术后 6 个月\n术后 12 个月\n术后 24 个月\n术后 36 个月",
      adVersion: "v1.0",
      adVersionDate: new Date("2025-02-25"),
      ethicsApproval: "已获本院伦理委员会审批",
      qrcodeUrl: null,
    },
    {
      slug: "silk-forehead-wrinkle-2025",
      title: "注射用丝素蛋白凝胶纠正额头纹招募",
      disease: "额部动力性皱纹",
      city: "广州",
      phase: null,
      status: "recruiting",
      isPublic: true,
      isFeatured: true,
      summary:
        "18 周岁以上、额头纹 WSRS 评分中度或重度（3–4 级）人群，参与多中心随机对照临床试验，评估注射用丝素蛋白凝胶改善额头纹的效果与安全性。",
      description:
        "本研究评价注射用丝素蛋白凝胶用于纠正额部动力性皱纹（额头纹）的有效性和安全性。研究采用前瞻性、多中心、随机、平行对照、评估者设盲、非劣效性设计。",
      inclusionBrief:
        "年龄 ≥18 周岁，性别不限；额头纹 WSRS 评分中度或重度（3 级或 4 级）；自愿签署知情同意。",
      exclusionBrief:
        "以研究方案为准（原广告未公开排除标准，待运营补充）。",
      sponsor: "维纳丝医疗科技（苏州）有限公司",
      intervention: "注射用丝素蛋白凝胶",
      studyDesign: "前瞻性、多中心、随机、平行对照、评估者设盲、非劣效性临床试验",
      targetEnrollment: null,
      siteName: "广州市番禺区（具体医院待运营确认）",
      siteAddress: null,
      contactPerson: null,
      contactPhone: null,
      benefits: null,
      followUpPlan: null,
      adVersion: "v1.0",
      adVersionDate: new Date("2025-02-25"),
      ethicsApproval: "已获本院伦理委员会审批",
      qrcodeUrl: null,
    },
    {
      slug: "linac-oncology-wuwei-2025",
      title: "医用电子直线加速器 HK-X601A 肿瘤放疗临床试验",
      disease: "恶性实体肿瘤",
      city: "武威",
      phase: null,
      status: "recruiting",
      isPublic: true,
      isFeatured: false,
      summary:
        "18–80 岁、经病理或影像学确诊的颅内/头颈/胸腹/脊柱/盆腔/四肢恶性实体肿瘤患者，参与评估医用电子直线加速器 HK-X601A 放射治疗有效性与安全性的临床研究。",
      description:
        "本研究评估医用电子直线加速器（HK-X601A）用于肿瘤放射治疗的安全性与有效性。招募渠道包含易拉宝、传单、微信、豆瓣推文。",
      inclusionBrief:
        "18–80 周岁；病理或影像学确诊实体肿瘤；至少 1 个 RECIST1.1 可测量病灶；ECOG ≤2；预期生存 ≥6 个月；自愿签署知情同意。",
      exclusionBrief:
        "入组前 30 天内曾对靶病灶介入/消融；入组前 30 天内接受过化疗/靶向/免疫治疗；术后未满 2 周；无可测量病灶。",
      sponsor: null,
      intervention: "医用电子直线加速器 HK-X601A",
      studyDesign: null,
      targetEnrollment: null,
      siteName: "甘肃省武威肿瘤医院肿瘤科",
      siteAddress: "甘肃省武威市武威肿瘤医院",
      contactPerson: null,
      contactPhone: null,
      benefits: null,
      followUpPlan: null,
      adVersion: "v1.0",
      adVersionDate: new Date("2025-02-25"),
      ethicsApproval: "已获本院伦理委员会审批",
      qrcodeUrl: null,
    },
  ];

  // 清掉 M0 的 mock slug（幂等）
  await prisma.clinicalTrial.deleteMany({
    where: {
      slug: {
        in: [
          "dm-t2-phase3-2026",
          "bc-her2-phase2-2026",
          "ra-biologic-phase3-2026",
        ],
      },
    },
  });

  for (const t of trials) {
    await prisma.clinicalTrial.upsert({
      where: { slug: t.slug },
      update: t,
      create: t,
    });
  }

  // admin 账号（dev 固定）
  const username = "admin";
  const password = "admin123";
  const existing = await prisma.operatorUser.findUnique({ where: { username } });
  if (!existing) {
    await prisma.operatorUser.create({
      data: {
        username,
        passwordHash: hashPassword(password),
        displayName: "超级管理员",
        role: "admin",
        status: "active",
      },
    });
  }

  const trialCount = await prisma.clinicalTrial.count();
  const operatorCount = await prisma.operatorUser.count();
  console.log(
    `[seed] 完成。试验 ${trialCount} 条；后台账号 ${operatorCount} 个（admin / admin123）`,
  );
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
