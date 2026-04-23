/**
 * M8.2 · LLM sanity test
 *
 * 运行：
 *   cd app && DATABASE_URL="file:./dev.db" npx tsx scripts/test-m8-2-llm-sanity.ts
 *
 * 做的事：
 * 1. 确认 `.env.local` 的 DEEPSEEK_API_KEY 能加载
 * 2. 发一条"介绍一下你自己（10 字内）"给 LlmProvider
 * 3. 打印响应 + tokens + cost
 * 4. 验证 `LlmCallLog` 表里写了一条
 */

import "dotenv/config";
// tsx 脚本不会自动读 .env.local，这里显式加载（Next.js runtime 不受影响）
import { config as dotenvConfig } from "dotenv";
import path from "node:path";
import fs from "node:fs";
const envLocal = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envLocal)) {
  dotenvConfig({ path: envLocal, override: true });
}
import { callWithLogging } from "../src/lib/llm-log";
import { prisma } from "../src/lib/prisma";

async function main() {
  const hasKey = Boolean(process.env.DEEPSEEK_API_KEY);
  console.log(`[env] DEEPSEEK_API_KEY present: ${hasKey}`);
  if (hasKey) {
    console.log(`[env] DEEPSEEK_BASE_URL: ${process.env.DEEPSEEK_BASE_URL ?? "(default)"}`);
  }

  const before = await prisma.llmCallLog.count();
  console.log(`[db] LlmCallLog rows before: ${before}`);

  const result = await callWithLogging({
    scenario: "llm_sanity",
    input: {
      system: "你是一个简洁的 AI 助手。用中文回答，不超过 15 个字。",
      user: "介绍一下你自己（sanity test）",
      maxTokens: 50,
    },
  });

  console.log("=== LLM response ===");
  console.log(`provider: ${result.output.provider}`);
  console.log(`model:    ${result.output.model}`);
  console.log(`text:     ${result.output.text.slice(0, 200)}`);
  console.log(`usage:    ${JSON.stringify(result.output.usage ?? {})}`);
  console.log(`duration: ${result.durationMs}ms`);
  console.log(`cost:     ¥${result.costCny}`);
  console.log(`logId:    ${result.logId}`);

  const after = await prisma.llmCallLog.count();
  console.log(`[db] LlmCallLog rows after: ${after} (should be ${before + 1})`);

  const latest = await prisma.llmCallLog.findFirst({
    orderBy: { createdAt: "desc" },
  });
  console.log(`[db] latest row: scenario=${latest?.scenario} provider=${latest?.provider} status=${latest?.status}`);

  if (after !== before + 1) {
    console.error("[fail] 日志行数未 +1");
    process.exit(1);
  }
  if (result.output.text.length === 0) {
    console.error("[fail] text 为空");
    process.exit(2);
  }
  console.log("[ok] M8.2 LLM sanity PASS");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error("[error]", err);
    await prisma.$disconnect();
    process.exit(3);
  });
