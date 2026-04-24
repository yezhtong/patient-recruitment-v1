import { createHash } from "node:crypto";
import { getLlmProvider } from "@/lib/llm";
import { callWithLogging } from "@/lib/llm-log";
import type { CommunityGroup } from "@/generated/prisma/client";

export interface DiseaseTag {
  label: string;
  keyword: string;
  confidence: number;
}

export const __MOCK_FIXTURE: DiseaseTag[] = [
  { label: "疑似心血管相关", keyword: "cardiovascular", confidence: 0.5 },
  { label: "头晕", keyword: "dizziness", confidence: 0.5 },
  { label: "睡眠障碍", keyword: "insomnia", confidence: 0.4 },
];

const SYSTEM_PROMPT = `你是医疗领域的疾病识别助手。用户描述了自己的症状，请返回 JSON 数组，每项含 \`label\`（中文疾病名）/ \`keyword\`（英文短关键词）/ \`confidence\`（0-1 浮点）。
限制：1) 最多返回 8 条；2) 只返回中文常见疾病，不要用 ICD 编码；3) 严禁给出治疗或用药建议。
输出格式示例：[{"label":"原发性高血压","keyword":"hypertension","confidence":0.92}]`;

const JSON_ARRAY_RE = /\[[\s\S]*?\]/;

const cache = new Map<string, { result: DiseaseTag[]; expiresAt: number }>();

function hashText(text: string): string {
  return createHash("sha256").update(text).digest("hex").slice(0, 16);
}

function isValidTag(v: unknown): v is DiseaseTag {
  if (!v || typeof v !== "object") return false;
  const t = v as Record<string, unknown>;
  return (
    typeof t.label === "string" &&
    typeof t.keyword === "string" &&
    typeof t.confidence === "number" &&
    t.confidence >= 0 &&
    t.confidence <= 1
  );
}

function parseTagsFromText(text: string): DiseaseTag[] | null {
  const match = text.match(JSON_ARRAY_RE);
  if (!match) return null;
  try {
    const parsed: unknown = JSON.parse(match[0]);
    if (!Array.isArray(parsed)) return null;
    const tags = parsed.filter(isValidTag);
    return tags.slice(0, 8);
  } catch {
    return null;
  }
}

export async function analyzeSymptoms(freeText: string): Promise<DiseaseTag[]> {
  const text = freeText.trim();
  if (!text) return [];

  const key = hashText(text);
  const now = Date.now();
  const cached = cache.get(key);
  if (cached && cached.expiresAt > now) return cached.result;

  // No real key: return mock fixture + write one log entry
  if (!process.env.DEEPSEEK_API_KEY) {
    await callWithLogging({
      scenario: "disease_analysis",
      input: {
        system: SYSTEM_PROMPT,
        user: text,
        maxTokens: 800,
        temperature: 0.3,
      },
    });
    cache.set(key, { result: __MOCK_FIXTURE, expiresAt: now + 60_000 });
    return __MOCK_FIXTURE;
  }

  try {
    const { output } = await callWithLogging({
      scenario: "disease_analysis",
      input: {
        system: SYSTEM_PROMPT,
        user: text,
        maxTokens: 800,
        temperature: 0.3,
      },
    });

    const tags = parseTagsFromText(output.text);
    if (!tags) throw new Error("invalid json from llm");

    cache.set(key, { result: tags, expiresAt: now + 60_000 });
    return tags;
  } catch {
    cache.set(key, { result: [], expiresAt: now + 60_000 });
    return [];
  }
}

export async function recommendGroups(
  userTags: DiseaseTag[],
  groups: CommunityGroup[],
  mode: "string" | "semantic" = "string",
): Promise<{ group: CommunityGroup; matchScore: number; matchedKeywords: string[] }[]> {
  if (userTags.length === 0) return [];

  if (mode === "semantic") {
    try {
      return await _recommendSemantic(userTags, groups);
    } catch {
      // fall through to string mode
    }
  }

  return _recommendString(userTags, groups);
}

function _recommendString(
  userTags: DiseaseTag[],
  groups: CommunityGroup[],
): { group: CommunityGroup; matchScore: number; matchedKeywords: string[] }[] {
  const results: { group: CommunityGroup; matchScore: number; matchedKeywords: string[] }[] = [];

  for (const group of groups) {
    const candidates = new Set<string>();

    if (group.diseaseTag) {
      candidates.add(group.diseaseTag.toLowerCase());
    }

    if (group.recommendedDiseaseKeywords) {
      try {
        const parsed: unknown = JSON.parse(group.recommendedDiseaseKeywords);
        if (Array.isArray(parsed)) {
          for (const kw of parsed) {
            if (typeof kw === "string") candidates.add(kw.toLowerCase());
          }
        }
      } catch {
        // malformed JSON; skip
      }
    }

    let matchScore = 0;
    const matchedKeywords: string[] = [];

    for (const tag of userTags) {
      const tagLabel = tag.label.toLowerCase();
      const tagKeyword = tag.keyword.toLowerCase();
      for (const candidate of candidates) {
        if (
          tagLabel.includes(candidate) ||
          candidate.includes(tagLabel) ||
          tagKeyword.includes(candidate) ||
          candidate.includes(tagKeyword)
        ) {
          matchScore += 1;
          if (!matchedKeywords.includes(candidate)) matchedKeywords.push(candidate);
          break;
        }
      }
    }

    if (matchScore > 0) {
      results.push({ group, matchScore, matchedKeywords });
    }
  }

  return results.sort((a, b) => b.matchScore - a.matchScore);
}

async function _recommendSemantic(
  userTags: DiseaseTag[],
  groups: CommunityGroup[],
): Promise<{ group: CommunityGroup; matchScore: number; matchedKeywords: string[] }[]> {
  const labelList = userTags.map((t) => t.label).join("、");
  const groupSummaries = groups
    .map((g) => {
      const kwRaw = g.recommendedDiseaseKeywords ?? "";
      let kws: string[] = [];
      try {
        const parsed: unknown = JSON.parse(kwRaw);
        if (Array.isArray(parsed)) kws = parsed.filter((x): x is string => typeof x === "string");
      } catch {
        // ignore
      }
      if (g.diseaseTag) kws.unshift(g.diseaseTag);
      return `${g.id}|${g.name}|${kws.join(",")}`;
    })
    .join("\n");

  const systemPrompt = `你是医疗社群匹配助手。根据用户的疾病标签，为每个社群打匹配分。
返回 JSON 数组，每项含 groupId / score（0-1）/ reason（一句话中文）。
示例：[{"groupId":"clxxx","score":0.8,"reason":"用户高血压与本群重点方向吻合"}]`;

  const userPrompt = `用户疾病标签：${labelList}\n\n社群列表（ID|名称|关键词）：\n${groupSummaries}\n\n请返回匹配结果 JSON 数组。`;

  const { output } = await callWithLogging({
    scenario: "group_recommend_semantic",
    input: {
      system: systemPrompt,
      user: userPrompt,
      maxTokens: 1200,
      temperature: 0.3,
    },
  });

  const match = output.text.match(JSON_ARRAY_RE);
  if (!match) throw new Error("semantic: no json array");

  const parsed: unknown = JSON.parse(match[0]);
  if (!Array.isArray(parsed)) throw new Error("semantic: not array");

  type SemanticItem = { groupId: string; score: number; reason?: string };
  const items = parsed.filter(
    (v): v is SemanticItem =>
      !!v &&
      typeof v === "object" &&
      typeof (v as Record<string, unknown>).groupId === "string" &&
      typeof (v as Record<string, unknown>).score === "number",
  );

  const groupMap = new Map(groups.map((g) => [g.id, g]));

  return items
    .map((item) => {
      const group = groupMap.get(item.groupId);
      if (!group) return null;
      return {
        group,
        matchScore: item.score,
        matchedKeywords: item.reason ? [item.reason] : [],
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => b.matchScore - a.matchScore);
}
