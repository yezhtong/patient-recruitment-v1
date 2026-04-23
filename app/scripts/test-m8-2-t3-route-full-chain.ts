/**
 * M8.2 T3 · route.ts 内部模块 E2E
 *
 * ⚠️ 已知限制：
 *   tsx 脚本无 Next.js runtime，route handler 内 `cookies()` 从 AsyncLocalStorage 读
 *   不到请求 cookies，即使 Request 里设了 Cookie header 也读不出来。
 *   所以无法在 tsx 里完整 cover route 的"登录态+鉴权通过"分支。
 *
 * 验收分三条路线：
 *   (A) 本脚本 · 鉴权拒绝路径：未登录调 POST handler 返回 401 正确
 *   (B) 本脚本 · 内部核心链：直接跑 route 内部用的模块（callWithLogging / upsert / audit）
 *       验证 DB / AuditLog / LlmCallLog 正确写入。与 route.ts 走同一套 schema/api。
 *   (C) `test-m8-2-t3-curl-happy-path.sh` · 真 HTTP：启动 dev server + curl 登录后调 API
 *       这是真正的 end-to-end。
 *
 * 运行：
 *   cd app && DATABASE_URL="file:./dev.db" npx tsx scripts/test-m8-2-t3-route-full-chain.ts
 */

import "dotenv/config";
import { config as dotenvConfig } from "dotenv";
import path from "node:path";
import fs from "node:fs";
const envLocal = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envLocal)) {
  dotenvConfig({ path: envLocal, override: true });
}

import type { NextRequest } from "next/server";
import { prisma } from "../src/lib/prisma";
import { callWithLogging } from "../src/lib/llm-log";
import { POST } from "../src/app/api/admin/trials/[id]/generate-form/route";

const AD_TEXT = `一、项目：北京安贞医院难治性高血压合并慢性肾病肾动脉交感神经射频消融术（RDN）临床试验

二、招募条件：
1. 年龄 18-75 岁，性别不限
2. 诊室收缩压 ≥ 140 mmHg（服用 3 种及以上不同类降压药，其中包括一种利尿剂）
3. 已排除继发性高血压
4. 肾小球滤过率（eGFR）≥ 45 mL/min/1.73m²

三、排除：
1. 妊娠或哺乳期
2. 1 年内发生过急性心肌梗死、脑卒中

四、联系：王老师 / 周医生`;

const SYSTEM_PROMPT = `你是临床试验预筛表单抽取专家。我会给你一条试验的招募广告原文。请抽取出筛选患者所需要的预筛问题，输出**严格**的 JSON 数组（不要包 markdown 代码块，不要前后加任何解释）。

每项必须包含：
- fieldKey：英文 snake_case
- label：中文问题
- fieldType：single / multi / text / textarea / number / date / agree 之一
- options：若 single/multi 给 [{value,label}]
- isRequired：默认 true

最多 10 个字段。`;

function buildReq(trialId: string, body: unknown): NextRequest {
  const req = new Request(
    `http://localhost/api/admin/trials/${trialId}/generate-form`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  return req as unknown as NextRequest;
}

function stripJsonFence(text: string): string {
  const trimmed = text.trim();
  const m = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return m ? m[1].trim() : trimmed;
}

async function main() {
  console.log("=== M8.2 T3 · route E2E（内部模块 + 鉴权拒绝分支）===\n");

  // ---------- (A) 鉴权拒绝路径 ----------
  console.log("[A] 未登录调 POST → 应 401");
  const r1 = await POST(buildReq("any", { adText: "x".repeat(30) }), {
    params: Promise.resolve({ id: "any" }),
  });
  const b1 = (await r1.json()) as { error?: string };
  console.log(`    HTTP ${r1.status} · ${b1.error}`);
  if (r1.status !== 401) throw new Error(`expected 401, got ${r1.status}`);

  // ---------- (B) 内部核心链验证 ----------
  const trial = await prisma.clinicalTrial.findFirst({
    where: { isPublic: true },
    orderBy: { createdAt: "asc" },
  });
  if (!trial) throw new Error("DB 无公开试验");
  console.log(`\n[setup] trial=${trial.title.slice(0, 30)} id=${trial.id}`);

  const admin = await prisma.operatorUser.findFirst();
  if (!admin) throw new Error("DB 无 OperatorUser");

  const before = {
    llmLogs: await prisma.llmCallLog.count({
      where: { scenario: "prescreen_form_generate_e2e_internal" },
    }),
    items: await prisma.trialPrescreenFormItem.count({
      where: { form: { trialId: trial.id } },
    }),
  };

  console.log("\n[B1] callWithLogging → DeepSeek（真调，约 10-15s）");
  const llm = await callWithLogging({
    scenario: "prescreen_form_generate_e2e_internal",
    operatorId: admin.id,
    input: {
      system: SYSTEM_PROMPT,
      user: `试验标题：${trial.title}\n\n广告原文：\n${AD_TEXT}`,
      maxTokens: 2048,
      temperature: 0.2,
    },
  });
  console.log(`    provider=${llm.output.provider} duration=${llm.durationMs}ms cost=¥${llm.costCny}`);
  const rawArray = JSON.parse(stripJsonFence(llm.output.text));
  if (!Array.isArray(rawArray)) throw new Error("LLM 响应不是数组");
  console.log(`    解析得到 ${rawArray.length} 条字段`);

  console.log("\n[B2] Upsert TrialPrescreenForm + replace items");
  const form = await prisma.$transaction(async (tx) => {
    const existing = await tx.trialPrescreenForm.findUnique({
      where: { trialId: trial.id },
      select: { id: true },
    });
    const itemsData = (rawArray as Array<Record<string, unknown>>)
      .slice(0, 10)
      .map((raw, idx) => ({
        fieldKey: String(raw.fieldKey ?? `field_${idx}`),
        label: String(raw.label ?? ""),
        fieldType: String(raw.fieldType ?? "text"),
        options: raw.options ? JSON.stringify(raw.options) : null,
        isRequired: raw.isRequired !== false,
        sortOrder: (idx + 1) * 10,
      }));

    if (existing) {
      await tx.trialPrescreenFormItem.deleteMany({ where: { formId: existing.id } });
      return tx.trialPrescreenForm.update({
        where: { id: existing.id },
        data: {
          isPublished: false,
          generatedBy: "ai",
          generatedAt: new Date(),
          items: { create: itemsData },
        },
      });
    }
    return tx.trialPrescreenForm.create({
      data: {
        trialId: trial.id,
        isPublished: false,
        generatedBy: "ai",
        generatedAt: new Date(),
        items: { create: itemsData },
      },
    });
  });
  console.log(`    form.id=${form.id.slice(0, 12)} generatedBy=${form.generatedBy} isPublished=${form.isPublished}`);

  const after = {
    llmLogs: await prisma.llmCallLog.count({
      where: { scenario: "prescreen_form_generate_e2e_internal" },
    }),
    items: await prisma.trialPrescreenFormItem.count({
      where: { form: { trialId: trial.id } },
    }),
  };
  console.log(`    DB 变化: llmLogs ${before.llmLogs}→${after.llmLogs} · items this form ${before.items}→${after.items}`);
  if (after.llmLogs !== before.llmLogs + 1) throw new Error("LlmCallLog 未 +1");
  if (after.items < 3) throw new Error(`items 过少：${after.items}`);

  // 恢复 seed 原版的 form（避免污染其他测试）
  console.log("\n[B3] 回滚 seed 原版表单以免污染");
  await prisma.$transaction(async (tx) => {
    await tx.trialPrescreenFormItem.deleteMany({ where: { formId: form.id } });
    await tx.trialPrescreenForm.delete({ where: { id: form.id } });
  });
  console.log("    ✓ 删除 AI 生成的 form。原 seed 表单需重新跑 seed-prescreen-forms.ts 恢复");

  console.log("\n[ok] M8.2 T3 内部链路 PASS");
  console.log("     真 HTTP happy path 请用 scripts/test-m8-2-t3-curl-happy-path.sh 验证");
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("\n[FAIL]", err);
  await prisma.$disconnect();
  process.exit(1);
});
