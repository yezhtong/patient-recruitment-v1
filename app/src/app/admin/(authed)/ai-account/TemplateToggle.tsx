"use client";

import { useTransition } from "react";
import { toggleAiTemplate } from "@/lib/actions/ai-account";

export function TemplateToggle({
  templateId,
  enabled,
  scenario,
}: {
  templateId: string;
  enabled: boolean;
  scenario: string;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <label className="admin-toggle" aria-busy={pending}>
      <input
        type="checkbox"
        checked={enabled}
        disabled={pending}
        onChange={() => {
          startTransition(async () => {
            await toggleAiTemplate(templateId, !enabled);
          });
        }}
        aria-label={`${enabled ? "停用" : "启用"} AI 模板 ${scenario}`}
      />
      <span className="track" />
      <span className="thumb" />
    </label>
  );
}
