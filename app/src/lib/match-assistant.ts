import { prisma } from "@/lib/prisma";
import { callWithLogging } from "@/lib/llm-log";
import type { MatchAssistantSession } from "@/generated/prisma/client";

export const MATCH_ASSISTANT_DISCLAIMER =
  "⚠️ 本助手不是医生，不提供诊断或治疗建议。所有信息仅供参考，具体医疗决定请咨询专业医师。如遇紧急情况请拨打 120。";

const SYSTEM_PROMPT = `你是一个临床试验推荐助手。严格遵守：
1. 禁止给出医学诊断、处方、治疗建议
2. 禁止说"你可能得了 XX 病"或"建议服用 XX"
3. 必须按以下 JSON 格式输出：
   { "symptomDirection": "...", "suggestedDepartment": "...", "followUpQuestions": ["..."], "readyToRecommend": false }
4. 当 readyToRecommend=true 时表示信息足够，可以推荐试验
5. symptomDirection 只说"提示关注 XX 系统"（如"心血管""内分泌""神经"），不说病名
6. suggestedDepartment 只说科室名称（如"心内科""神经内科"）`;

const COMPLIANCE_RE = /你可能得了|你得了|建议服用|建议吃/;

const FALLBACK_ASSISTANT_MESSAGE = "先问一轮症状";

const TURN_LIMIT_MESSAGE =
  "根据你描述的内容，建议先咨询医生后再回来匹配试验。";

const CLARIFY_FALLBACK_MESSAGE =
  "很抱歉，我没听清楚你的描述，可以再详细说说吗？";

interface Transcript {
  role: "user" | "assistant";
  content: string;
  ts: string;
}

interface LlmJsonOutput {
  symptomDirection?: string;
  suggestedDepartment?: string;
  followUpQuestions?: string[];
  readyToRecommend?: boolean;
}

function parseTranscript(raw: string): Transcript[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (t): t is Transcript =>
        !!t &&
        typeof t === "object" &&
        (t as Record<string, unknown>).role === "user" ||
        (!!t &&
          typeof t === "object" &&
          (t as Record<string, unknown>).role === "assistant"),
    );
  } catch {
    return [];
  }
}

function tryParseJson(text: string): LlmJsonOutput | null {
  const stripped = text.trim().replace(/^```(?:json)?\s*|\s*```$/gi, "");
  const objectMatch = stripped.match(/\{[\s\S]*\}/);
  if (!objectMatch) return null;
  try {
    const parsed: unknown = JSON.parse(objectMatch[0]);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as LlmJsonOutput;
  } catch {
    return null;
  }
}

function sanitizeMessage(msg: string, suggestedDepartment: string | undefined): string {
  if (COMPLIANCE_RE.test(msg)) {
    console.warn("[match-assistant] compliance rewrite triggered on:", msg.slice(0, 100));
    return `建议到${suggestedDepartment ?? "相关科室"}就诊`;
  }
  return msg;
}

interface TrialRow {
  id: string;
  slug: string;
  title: string;
  city: string;
  phase: string | null;
}

async function queryTrials(keywords: string[]): Promise<TrialRow[]> {
  if (keywords.length === 0) return [];
  const trials = await prisma.clinicalTrial.findMany({
    where: {
      status: "recruiting",
      OR: keywords.flatMap((kw) => [
        { disease: { contains: kw } },
        { title: { contains: kw } },
      ]),
    },
    select: { id: true, slug: true, title: true, city: true, phase: true },
    take: 3,
  });
  return trials;
}

export interface SendMessageResult {
  sessionId: string;
  assistantMessage: string;
  readyToRecommend: boolean;
  symptomDirection?: string;
  suggestedDepartment?: string;
  followUpQuestions?: string[];
  recommendedTrials?: TrialRow[];
  disclaimer: string;
}

export async function sendMessage(input: {
  userId: string;
  sessionId?: string;
  userMessage: string;
}): Promise<SendMessageResult> {
  const { userId, userMessage } = input;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, aiDiseaseTags: true },
  });
  if (!user) throw new Error("User not found");

  let session: MatchAssistantSession | null = null;
  if (input.sessionId) {
    session = await prisma.matchAssistantSession.findFirst({
      where: { id: input.sessionId, userId },
    });
  }

  const transcript: Transcript[] = session ? parseTranscript(session.transcript) : [];

  const userTurns = transcript.filter((t) => t.role === "user").length;

  if (userTurns >= 5) {
    const now = new Date().toISOString();
    const updated: Transcript[] = [
      ...transcript,
      { role: "user", content: userMessage, ts: now },
      { role: "assistant", content: TURN_LIMIT_MESSAGE, ts: now },
    ];
    const saved = await upsertSession(session, userId, updated, null, null, null, null);
    return {
      sessionId: saved.id,
      assistantMessage: TURN_LIMIT_MESSAGE,
      readyToRecommend: false,
      disclaimer: MATCH_ASSISTANT_DISCLAIMER,
    };
  }

  let userTagKeywords: string[] = [];
  if (user.aiDiseaseTags) {
    try {
      const tags: unknown = JSON.parse(user.aiDiseaseTags);
      if (Array.isArray(tags)) {
        userTagKeywords = tags
          .filter(
            (t): t is { keyword: string } =>
              !!t && typeof t === "object" && typeof (t as Record<string, unknown>).keyword === "string",
          )
          .map((t) => t.keyword);
      }
    } catch {
      // ignore malformed tags
    }
  }

  const tagSummary =
    userTagKeywords.length > 0
      ? `用户已填写症状标签：${userTagKeywords.join("、")}`
      : "";

  const userPrompt = tagSummary
    ? `${userMessage}\n\n（${tagSummary}）`
    : userMessage;

  let llmOutput: LlmJsonOutput | null = null;
  let symptomDirection: string | undefined;
  let suggestedDepartment: string | undefined;

  try {
    const { output } = await callWithLogging({
      scenario: "match_assistant",
      input: {
        system: SYSTEM_PROMPT,
        user: userPrompt,
        maxTokens: 800,
        temperature: 0.3,
      },
    });

    llmOutput = tryParseJson(output.text);
  } catch {
    // LLM call failed; use fallback
  }

  const now = new Date().toISOString();
  const updatedTranscript: Transcript[] = [
    ...transcript,
    { role: "user", content: userMessage, ts: now },
  ];

  if (!llmOutput) {
    const assistantMessage = CLARIFY_FALLBACK_MESSAGE;
    updatedTranscript.push({ role: "assistant", content: assistantMessage, ts: now });
    const saved = await upsertSession(
      session,
      userId,
      updatedTranscript,
      userTagKeywords.length > 0 ? user.aiDiseaseTags : null,
      null,
      null,
      null,
    );
    return {
      sessionId: saved.id,
      assistantMessage,
      readyToRecommend: false,
      followUpQuestions: [FALLBACK_ASSISTANT_MESSAGE],
      disclaimer: MATCH_ASSISTANT_DISCLAIMER,
    };
  }

  symptomDirection = llmOutput.symptomDirection;
  suggestedDepartment = llmOutput.suggestedDepartment;
  const followUpQuestions = llmOutput.followUpQuestions ?? [];
  const readyToRecommend = llmOutput.readyToRecommend === true;

  if (readyToRecommend) {
    const keywords = [
      ...userTagKeywords,
      ...(symptomDirection ? [symptomDirection] : []),
    ].filter(Boolean);

    const trials = await queryTrials(keywords);

    const trialList =
      trials.length > 0
        ? trials.map((t) => `- ${t.title}（${t.city} · ${t.phase ?? "未知期"}）`).join("\n")
        : "暂无匹配的在招试验。";

    const rawMessage = `根据你的描述：\n\n1. 症状可能关注方向：${symptomDirection ?? "待进一步了解"}\n\n2. 建议就医科室：${suggestedDepartment ?? "相关科室"}\n\n3. 目前可参加的临床试验：\n${trialList}`;

    const assistantMessage = sanitizeMessage(rawMessage, suggestedDepartment);
    updatedTranscript.push({ role: "assistant", content: assistantMessage, ts: now });

    const trialIds = trials.map((t) => t.id).join(",");
    const saved = await upsertSession(
      session,
      userId,
      updatedTranscript,
      user.aiDiseaseTags,
      symptomDirection ?? null,
      suggestedDepartment ?? null,
      trialIds || null,
    );

    return {
      sessionId: saved.id,
      assistantMessage,
      readyToRecommend: true,
      symptomDirection,
      suggestedDepartment,
      recommendedTrials: trials.map((t) => ({ ...t, phase: t.phase ?? "" })),
      disclaimer: MATCH_ASSISTANT_DISCLAIMER,
    };
  }

  const nextQuestion =
    followUpQuestions.length > 0
      ? followUpQuestions[0]
      : CLARIFY_FALLBACK_MESSAGE;

  const assistantMessage = sanitizeMessage(nextQuestion, suggestedDepartment);
  updatedTranscript.push({ role: "assistant", content: assistantMessage, ts: now });

  const saved = await upsertSession(
    session,
    userId,
    updatedTranscript,
    userTurns === 0 ? user.aiDiseaseTags : null,
    symptomDirection ?? null,
    suggestedDepartment ?? null,
    null,
  );

  return {
    sessionId: saved.id,
    assistantMessage,
    readyToRecommend: false,
    symptomDirection,
    suggestedDepartment,
    followUpQuestions,
    disclaimer: MATCH_ASSISTANT_DISCLAIMER,
  };
}

async function upsertSession(
  existing: MatchAssistantSession | null,
  userId: string,
  transcript: Transcript[],
  symptomsSnapshot: string | null,
  symptomDirection: string | null,
  recommendedDepartment: string | null,
  recommendedTrialIds: string | null,
): Promise<MatchAssistantSession> {
  const transcriptJson = JSON.stringify(transcript);

  if (existing) {
    return prisma.matchAssistantSession.update({
      where: { id: existing.id },
      data: {
        transcript: transcriptJson,
        ...(symptomsSnapshot !== null ? { symptomsSnapshot } : {}),
        ...(symptomDirection !== null ? { symptomDirection } : {}),
        ...(recommendedDepartment !== null ? { recommendedDepartment } : {}),
        ...(recommendedTrialIds !== null ? { recommendedTrialIds } : {}),
      },
    });
  }

  return prisma.matchAssistantSession.create({
    data: {
      userId,
      transcript: transcriptJson,
      symptomsSnapshot,
      symptomDirection,
      recommendedDepartment,
      recommendedTrialIds,
    },
  });
}

export async function getSession(
  sessionId: string,
  userId: string,
): Promise<MatchAssistantSession | null> {
  return prisma.matchAssistantSession.findFirst({
    where: { id: sessionId, userId },
  });
}
