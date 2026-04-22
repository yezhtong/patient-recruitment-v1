// 试验筛选：疾病大类映射 + 计数辅助
// 按已入库的 43 条试验整理，9 大类 + 全部明细
// 若未来新增试验，新的 disease 名会归入"其他"；把它加到合适的大类即可

export type DiseaseCategoryId =
  | "metabolic"
  | "cosmetic"
  | "digestive"
  | "neuro"
  | "respiratory"
  | "oncology"
  | "cardiovascular"
  | "ophthalmology"
  | "other";

export interface DiseaseCategory {
  id: DiseaseCategoryId;
  label: string;
  keywords: string[];
}

export const DISEASE_CATEGORIES: DiseaseCategory[] = [
  {
    id: "metabolic",
    label: "代谢 / 内分泌",
    keywords: [
      "糖尿病",
      "高脂血症",
      "痛风",
      "高尿酸",
      "MASH",
      "脂肪性肝炎",
      "非酒精性肝脂肪变",
      "肥胖",
      "肾阳虚",
    ],
  },
  {
    id: "cosmetic",
    label: "医美 / 皮肤",
    keywords: [
      "皱纹",
      "鱼尾纹",
      "鼻唇沟",
      "眶下凹陷",
      "面部皮肤状态",
      "局灶性硬皮病",
      "皮肤干燥",
    ],
  },
  {
    id: "digestive",
    label: "消化 / 肝胆",
    keywords: [
      "幽门螺杆菌",
      "功能性消化不良",
      "慢性非萎缩性胃炎",
      "急性胰腺炎",
      "失代偿期肝硬化",
      "溃疡性结肠炎",
    ],
  },
  {
    id: "neuro",
    label: "神经 / 精神",
    keywords: ["癫痫", "婴儿痉挛", "纤维肌痛", "腰背痛", "抑郁障碍"],
  },
  {
    id: "respiratory",
    label: "呼吸系统",
    keywords: ["慢性阻塞性肺疾病", "上呼吸道感染", "肺动脉高压"],
  },
  {
    id: "oncology",
    label: "肿瘤",
    keywords: ["恶性实体肿瘤", "前列腺癌"],
  },
  {
    id: "cardiovascular",
    label: "心血管",
    keywords: ["难治性高血压"],
  },
  {
    id: "ophthalmology",
    label: "眼科",
    keywords: ["干眼症", "斜视"],
  },
  {
    id: "other",
    label: "口腔 / 男科 / 其他",
    keywords: ["口腔白斑病", "原发性早泄"],
  },
];

export function categoryOfDisease(disease: string): DiseaseCategoryId | null {
  for (const c of DISEASE_CATEGORIES) {
    if (c.keywords.some((k) => disease.includes(k))) return c.id;
  }
  return null;
}

export function getCategoryById(id: string | undefined): DiseaseCategory | null {
  if (!id) return null;
  return DISEASE_CATEGORIES.find((c) => c.id === id) ?? null;
}

// 把具体 disease 列表聚合成"大类计数"
export function summarizeCategories(
  rows: { disease: string }[],
): { id: DiseaseCategoryId; label: string; count: number }[] {
  const counts = new Map<DiseaseCategoryId, number>();
  for (const r of rows) {
    const id = categoryOfDisease(r.disease) ?? "other";
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return DISEASE_CATEGORIES.map((c) => ({
    id: c.id,
    label: c.label,
    count: counts.get(c.id) ?? 0,
  })).filter((x) => x.count > 0);
}

// 把任意键数组 groupBy 成 {key,count}，按 count 倒序
export function countBy<T extends string>(values: T[]): { key: T; count: number }[] {
  const m = new Map<T, number>();
  for (const v of values) m.set(v, (m.get(v) ?? 0) + 1);
  return [...m.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh-CN"))
    .map(([key, count]) => ({ key, count }));
}

// 状态可视化
export const STATUS_LABELS: Record<string, string> = {
  recruiting: "招募中",
  paused: "暂停招募",
  closed: "已结束",
};
