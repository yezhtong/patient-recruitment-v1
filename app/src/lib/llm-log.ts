import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import {
  getLlmProvider,
  estimateCostCny,
  type LlmChatInput,
  type LlmChatOutput,
} from "@/lib/llm";

/**
 * M8.2 · 统一 LLM 调用包装器
 *
 * 所有调 LLM 的地方都必须通过本函数；保证：
 * 1. `LlmCallLog` 表里一条记录不漏
 * 2. 错误/超时也写一条 status=error/timeout 的记录
 * 3. prompt hash 记录（便于日后去重、缓存、追溯）
 */
export async function callWithLogging(params: {
  scenario: string;            // prescreen_generate / match_assistant / community_review / disease_analysis / llm_sanity
  operatorId?: string | null;
  input: LlmChatInput;
}): Promise<{
  output: LlmChatOutput;
  logId: string;
  durationMs: number;
  costCny: number;
}> {
  const provider = getLlmProvider();
  const started = Date.now();

  const promptBody = (params.input.system ? params.input.system + "\n" : "") + params.input.user;
  const promptHash = createHash("sha256").update(promptBody).digest("hex").slice(0, 16);
  const promptChars = promptBody.length;

  try {
    const output = await provider.chat(params.input);
    const durationMs = Date.now() - started;
    const costCny = estimateCostCny(output.usage, output.provider);

    const log = await prisma.llmCallLog.create({
      data: {
        operatorId: params.operatorId ?? null,
        scenario: params.scenario,
        provider: output.provider,
        model: output.model,
        promptHash,
        promptChars,
        responseChars: output.text.length,
        promptTokens: output.usage?.prompt ?? null,
        completionTokens: output.usage?.completion ?? null,
        totalTokens: output.usage?.total ?? null,
        estimatedCostCny: costCny || null,
        durationMs,
        status: "success",
      },
    });

    return { output, logId: log.id, durationMs, costCny };
  } catch (err) {
    const durationMs = Date.now() - started;
    const msg = err instanceof Error ? err.message : String(err);
    const isTimeout = msg.toLowerCase().includes("abort") || msg.toLowerCase().includes("timeout");

    await prisma.llmCallLog.create({
      data: {
        operatorId: params.operatorId ?? null,
        scenario: params.scenario,
        provider: provider.name,
        model: null,
        promptHash,
        promptChars,
        responseChars: null,
        durationMs,
        status: isTimeout ? "timeout" : "error",
        errorMessage: msg.slice(0, 500),
      },
    });

    throw err;
  }
}
