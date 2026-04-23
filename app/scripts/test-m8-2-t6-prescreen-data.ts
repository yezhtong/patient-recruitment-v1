/**
 * M8.2 T6 · 验证 3 条真实试验的 TrialPrescreenForm 数据层
 *
 * 运行：
 *   cd app && DATABASE_URL="file:./dev.db" npx tsx scripts/test-m8-2-t6-prescreen-data.ts
 */

import "dotenv/config";
import { config as dotenvConfig } from "dotenv";
import path from "node:path";
import fs from "node:fs";
const envLocal = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envLocal)) {
  dotenvConfig({ path: envLocal, override: true });
}

import { prisma } from "../src/lib/prisma";

async function main() {
  const slugs = [
    "silk-forehead-wrinkle-2025",
    "linac-oncology-wuwei-2025",
    "rdn-hypertension-beijing-2025",
  ];

  let totalPass = 0;
  for (const slug of slugs) {
    const trial = await prisma.clinicalTrial.findUnique({
      where: { slug },
      select: { id: true, title: true },
    });
    if (!trial) {
      console.error(`[fail] trial not found: ${slug}`);
      continue;
    }
    const form = await prisma.trialPrescreenForm.findUnique({
      where: { trialId: trial.id },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    });
    if (!form) {
      console.error(`[fail] no form for: ${slug}`);
      continue;
    }
    console.log(
      `\n>>> ${trial.title}`,
      `\n    form.id=${form.id.slice(0, 10)} published=${form.isPublished} generatedBy=${form.generatedBy}`,
      `\n    title="${form.title ?? "(null)"}"`,
      `\n    items: ${form.items.length}`,
    );
    for (const it of form.items) {
      const opts = it.options ? JSON.parse(it.options) : null;
      console.log(
        `      [${it.sortOrder}] ${it.fieldKey} (${it.fieldType})${it.isRequired ? " *" : ""} ${it.label.slice(0, 40)}${opts ? ` · ${opts.length} opts` : ""}`,
      );
    }
    if (form.items.length >= 3 && form.isPublished) totalPass++;
  }

  console.log(`\n=== 总结 ===`);
  console.log(`通过 ${totalPass}/${slugs.length} 条试验有可用的已发布表单`);
  if (totalPass === slugs.length) {
    console.log("[ok] M8.2 T6 数据层 PASS · 动态预筛渲染具备数据基础");
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
