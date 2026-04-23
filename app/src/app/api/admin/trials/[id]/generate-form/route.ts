import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-session";
import { writeAuditLog } from "@/lib/audit";
import { callWithLogging } from "@/lib/llm-log";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const bodySchema = z.object({
  adText: z.string().min(20).max(4000),
});

const fieldTypes = [
  "single",
  "multi",
  "text",
  "textarea",
  "number",
  "date",
  "agree",
] as const;

const itemSchema = z.object({
  fieldKey: z.string().regex(/^[a-z][a-z0-9_]*$/),
  label: z.string().min(1).max(120),
  fieldType: z.enum(fieldTypes),
  options: z
    .array(z.object({ value: z.string(), label: z.string() }))
    .optional(),
  isRequired: z.boolean().optional(),
  helpText: z.string().optional(),
  placeholder: z.string().optional(),
  defaultValue: z.string().optional(),
});

const SYSTEM_PROMPT = `你是临床试验预筛表单抽取专家。我会给你一条试验的招募广告原文。请抽取出筛选患者所需要的预筛问题，输出**严格**的 JSON 数组（不要包 markdown 代码块，不要前后加任何解释）。

每项必须包含：
- fieldKey：英文 snake_case，如 "age" / "gender" / "diagnosis_confirmed"
- label：中文问题（如"你的年龄"）
- fieldType：single / multi / text / textarea / number / date / agree 之一
- options：如果是 single 或 multi，必须给出 [{value, label}] 数组
- isRequired：布尔，默认 true
- helpText：可选的辅助说明

规则：
1. 只抽取与入排标准直接相关的问题（年龄、性别、诊断、病程、既往治疗、并发症、过敏史、所在城市等）
2. 忽略联系方式（姓名、手机）和知情同意
3. 字段顺序：年龄 → 性别 → 诊断/病情 → 既往治疗 → 排除项 → 所在城市
4. 最多 10 个字段

输出示例（原样返回 JSON 数组）：
[{"fieldKey":"age","label":"你的年龄","fieldType":"number","isRequired":true}]`;

function stripJsonFence(text: string): string {
  const trimmed = text.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenceMatch ? fenceMatch[1].trim() : trimmed;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let session;
  try {
    session = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const { id: trialId } = await params;

  let body: z.infer<typeof bodySchema>;
  try {
    const json = await request.json();
    body = bodySchema.parse(json);
  } catch (err) {
    return NextResponse.json(
      {
        error: "Invalid body",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 400 }
    );
  }

  const trial = await prisma.clinicalTrial.findUnique({
    where: { id: trialId },
    select: { id: true, title: true },
  });
  if (!trial) {
    return NextResponse.json({ error: "Trial not found" }, { status: 404 });
  }

  let llm;
  try {
    llm = await callWithLogging({
      scenario: "prescreen_form_generate",
      operatorId: session.operatorId,
      input: {
        system: SYSTEM_PROMPT,
        user: `试验标题：${trial.title}\n\n广告原文：\n${body.adText}`,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const isTimeout =
      msg.toLowerCase().includes("abort") ||
      msg.toLowerCase().includes("timeout");
    return NextResponse.json(
      { error: isTimeout ? "LLM timeout" : "LLM error", detail: msg },
      { status: isTimeout ? 504 : 502 }
    );
  }

  const rawText = llm.output.text;
  const jsonText = stripJsonFence(rawText);

  let parsedArray: unknown;
  try {
    parsedArray = JSON.parse(jsonText);
  } catch {
    return NextResponse.json(
      {
        error: "LLM returned invalid JSON",
        rawText: rawText.slice(0, 500),
        logId: llm.logId,
      },
      { status: 500 }
    );
  }
  if (!Array.isArray(parsedArray)) {
    return NextResponse.json(
      {
        error: "LLM response is not an array",
        rawText: rawText.slice(0, 500),
        logId: llm.logId,
      },
      { status: 500 }
    );
  }

  const validItems: z.infer<typeof itemSchema>[] = [];
  const seen = new Set<string>();
  for (const raw of parsedArray) {
    const parsed = itemSchema.safeParse(raw);
    if (!parsed.success) continue;
    if (seen.has(parsed.data.fieldKey)) continue;
    seen.add(parsed.data.fieldKey);
    validItems.push(parsed.data);
  }

  if (validItems.length === 0) {
    return NextResponse.json(
      {
        error: "No valid fields extracted from LLM response",
        rawText: rawText.slice(0, 500),
        logId: llm.logId,
      },
      { status: 500 }
    );
  }

  const now = new Date();
  const form = await prisma.$transaction(async (tx) => {
    const existing = await tx.trialPrescreenForm.findFirst({
      where: { trialId },
      select: { id: true },
    });

    const itemsData = validItems.map((item, idx) => ({
      fieldKey: item.fieldKey,
      label: item.label,
      fieldType: item.fieldType,
      options: item.options ? JSON.stringify(item.options) : null,
      helpText: item.helpText ?? null,
      placeholder: item.placeholder ?? null,
      defaultValue: item.defaultValue ?? null,
      isRequired: item.isRequired ?? true,
      sortOrder: (idx + 1) * 10,
    }));

    if (existing) {
      await tx.trialPrescreenFormItem.deleteMany({
        where: { formId: existing.id },
      });
      return tx.trialPrescreenForm.update({
        where: { id: existing.id },
        data: {
          isPublished: false,
          generatedBy: "ai",
          generatedAt: now,
          items: { create: itemsData },
        },
      });
    }

    return tx.trialPrescreenForm.create({
      data: {
        trialId,
        isPublished: false,
        generatedBy: "ai",
        generatedAt: now,
        items: { create: itemsData },
      },
    });
  });

  await writeAuditLog({
    session,
    action: "prescreen_form.generate",
    entityType: "trial",
    entityId: trialId,
    summary: `AI 生成预筛表单（${validItems.length} 字段，¥${llm.costCny.toFixed(4)}）`,
    detail: {
      trialId,
      formId: form.id,
      itemCount: validItems.length,
      fieldKeys: validItems.map((i) => i.fieldKey),
      provider: llm.output.provider,
      model: llm.output.model,
      tokens: llm.output.usage?.total ?? null,
      costCny: llm.costCny,
      durationMs: llm.durationMs,
      logId: llm.logId,
    },
  });

  return NextResponse.json({
    ok: true,
    formId: form.id,
    itemCount: validItems.length,
    fieldKeys: validItems.map((i) => i.fieldKey),
    tokensUsed: llm.output.usage?.total ?? null,
    costCny: llm.costCny,
    durationMs: llm.durationMs,
    logId: llm.logId,
  });
}
