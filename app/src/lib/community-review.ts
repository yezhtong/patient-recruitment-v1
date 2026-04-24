import { scanText, summarizeHits } from "@/lib/sensitive-words";
import { callWithLogging } from "@/lib/llm-log";

export interface CommunityReviewOutcome {
  aiReviewResult: "pass" | "reject" | "review_needed";
  aiReviewConfidence: number;
  aiReviewReason: string;
  reviewStatus: "approved" | "rejected" | "pending";
  sensitiveHit?: { level: "high" | "medium" | "low"; keyword: string };
}

const SYSTEM_PROMPT = `你是社区内容审核员。判断以下内容是否适合发布在患者病友互助社区。
只输出 JSON：{"result": "pass|reject|review_needed", "confidence": 0.95, "reason": "简短理由"}
判断标准：
- 医疗诊断/处方建议 → reject（理由：医疗建议不应来自非专业人员）
- 虚假广告/推销 → reject
- 明显辱骂/人身攻击 → reject
- 争议性话题或不确定 → review_needed
- 正常分享/提问/互助 → pass`;

const MOCK_AD_RE = /广告|推广|优惠/;
const MOCK_MEDICAL_RE = /血压|糖尿病|手术|化疗|癌症|肿瘤|心脏|透析|用药|处方/;

function mockReview(content: string): { result: "pass" | "reject" | "review_needed"; confidence: number; reason: string } {
  if (MOCK_AD_RE.test(content)) {
    return { result: "reject", confidence: 0.9, reason: "疑似广告推销内容" };
  }
  if (MOCK_MEDICAL_RE.test(content)) {
    return { result: "pass", confidence: 0.85, reason: "正常医疗话题分享" };
  }
  return { result: "review_needed", confidence: 0.5, reason: "内容待人工核查" };
}

function mapToStatus(result: "pass" | "reject" | "review_needed", confidence: number): "approved" | "rejected" | "pending" {
  if (result === "pass" && confidence >= 0.8) return "approved";
  if (result === "reject" && confidence >= 0.8) return "rejected";
  return "pending";
}

export async function reviewContent(input: {
  scenario: "post" | "comment";
  title?: string;
  content: string;
  authorUserId?: string;
}): Promise<CommunityReviewOutcome> {
  const textToScan = input.title ? `${input.title} ${input.content}` : input.content;
  const hits = await scanText(textToScan);
  const summary = summarizeHits(hits);

  if (summary.hasHigh) {
    const hit = hits.find((h) => h.riskLevel === "high")!;
    return {
      aiReviewResult: "reject",
      aiReviewConfidence: 1.0,
      aiReviewReason: `命中敏感词词库: ${hit.keyword}`,
      reviewStatus: "rejected",
      sensitiveHit: { level: "high", keyword: hit.keyword },
    };
  }

  const userPrompt =
    input.scenario === "post" && input.title
      ? `标题: ${input.title}\n\n内容: ${input.content}`
      : `内容: ${input.content}`;

  let aiResult: "pass" | "reject" | "review_needed";
  let aiConfidence: number;
  let aiReason: string;

  try {
    const { output } = await callWithLogging({
      scenario: "community_review",
      operatorId: input.authorUserId ?? null,
      input: {
        system: SYSTEM_PROMPT,
        user: userPrompt,
        maxTokens: 256,
        temperature: 0.1,
        timeoutMs: 15_000,
      },
    });

    if (output.provider === "mock") {
      const combined = (input.title ?? "") + " " + input.content;
      const mocked = mockReview(combined);
      aiResult = mocked.result;
      aiConfidence = mocked.confidence;
      aiReason = mocked.reason;
    } else {
      const text = output.text.trim();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("no json");
      const parsed = JSON.parse(jsonMatch[0]) as {
        result?: string;
        confidence?: unknown;
        reason?: string;
      };
      const r = parsed.result;
      if (r !== "pass" && r !== "reject" && r !== "review_needed") throw new Error("invalid result");
      if (typeof parsed.confidence !== "number") throw new Error("invalid confidence");
      aiResult = r;
      aiConfidence = parsed.confidence;
      aiReason = typeof parsed.reason === "string" ? parsed.reason : "AI 审核完成";
    }
  } catch {
    return {
      aiReviewResult: "review_needed",
      aiReviewConfidence: 0.0,
      aiReviewReason: "AI 解析失败",
      reviewStatus: "pending",
    };
  }

  const sensitiveHit = summary.hasMedium
    ? (() => {
        const h = hits.find((x) => x.riskLevel === "medium" || x.riskLevel === "low");
        return h ? { level: h.riskLevel as "medium" | "low", keyword: h.keyword } : undefined;
      })()
    : undefined;

  return {
    aiReviewResult: aiResult,
    aiReviewConfidence: aiConfidence,
    aiReviewReason: aiReason,
    reviewStatus: mapToStatus(aiResult, aiConfidence),
    sensitiveHit,
  };
}
