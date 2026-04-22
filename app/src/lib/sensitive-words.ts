import { prisma } from "@/lib/prisma";

export type RiskLevel = "high" | "medium" | "low";
export type RiskType =
  | "contact"
  | "drug-sale"
  | "enroll-promise"
  | "quackery"
  | "ad";

export interface SensitiveHit {
  keyword: string;
  riskLevel: RiskLevel;
  riskType: RiskType;
  snippet: string;
  indexOfMatch: number;
}

interface Rule {
  keyword: string;
  riskLevel: RiskLevel;
  riskType: RiskType;
}

let _rules: Rule[] | null = null;
let _rulesLoadedAt = 0;
const CACHE_TTL_MS = 60_000;

async function loadRules(): Promise<Rule[]> {
  const now = Date.now();
  if (_rules && now - _rulesLoadedAt < CACHE_TTL_MS) return _rules;
  try {
    const rows = await prisma.sensitiveWord.findMany({
      where: { isEnabled: true },
      select: { keyword: true, riskLevel: true, riskType: true },
    });
    _rules = rows.map((r) => ({
      keyword: r.keyword,
      riskLevel: r.riskLevel as RiskLevel,
      riskType: r.riskType as RiskType,
    }));
    _rulesLoadedAt = now;
  } catch {
    _rules = _rules ?? [];
  }
  return _rules ?? [];
}

export function invalidateSensitiveWordsCache() {
  _rules = null;
  _rulesLoadedAt = 0;
}

const PHONE_RE = /(?<!\d)1[3-9]\d{9}(?!\d)/g;
const EMAIL_RE = /[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}/g;

export async function scanText(text: string): Promise<SensitiveHit[]> {
  if (!text) return [];
  const hits: SensitiveHit[] = [];
  const rules = await loadRules();

  for (const rule of rules) {
    let idx = text.indexOf(rule.keyword);
    while (idx >= 0) {
      hits.push({
        keyword: rule.keyword,
        riskLevel: rule.riskLevel,
        riskType: rule.riskType,
        snippet: text.slice(Math.max(0, idx - 10), idx + rule.keyword.length + 10),
        indexOfMatch: idx,
      });
      idx = text.indexOf(rule.keyword, idx + rule.keyword.length);
    }
  }

  for (const m of text.matchAll(PHONE_RE)) {
    hits.push({
      keyword: m[0],
      riskLevel: "high",
      riskType: "contact",
      snippet: text.slice(
        Math.max(0, (m.index ?? 0) - 10),
        (m.index ?? 0) + m[0].length + 10,
      ),
      indexOfMatch: m.index ?? 0,
    });
  }
  for (const m of text.matchAll(EMAIL_RE)) {
    hits.push({
      keyword: m[0],
      riskLevel: "high",
      riskType: "contact",
      snippet: text.slice(
        Math.max(0, (m.index ?? 0) - 10),
        (m.index ?? 0) + m[0].length + 10,
      ),
      indexOfMatch: m.index ?? 0,
    });
  }

  return hits;
}

export function summarizeHits(hits: SensitiveHit[]): {
  highCount: number;
  mediumCount: number;
  hasHigh: boolean;
  hasMedium: boolean;
} {
  let h = 0;
  let m = 0;
  for (const x of hits) {
    if (x.riskLevel === "high") h++;
    else m++;
  }
  return { highCount: h, mediumCount: m, hasHigh: h > 0, hasMedium: m > 0 };
}
