import type { DiseaseTag } from "@/lib/disease-matcher";

export function mergeDiseaseTags(
  existing: DiseaseTag[],
  incoming: DiseaseTag[],
): DiseaseTag[] {
  const map = new Map<string, DiseaseTag>();
  for (const tag of existing) {
    map.set(tag.keyword, tag);
  }
  for (const tag of incoming) {
    const prev = map.get(tag.keyword);
    if (!prev || tag.confidence > prev.confidence) {
      map.set(tag.keyword, tag);
    }
  }
  return Array.from(map.values());
}

export function appendSymptomsText(
  existing: string | null | undefined,
  groupName: string,
  added: string,
): string {
  if (!existing) return added;
  return `${existing}\n---\n[加入${groupName}时补充] ${added}`;
}
