"use client";

import { useTransition } from "react";
import { toggleSensitiveWord } from "@/lib/actions/sensitive-words";

export default function SensitiveWordEnableToggle({
  id,
  enabled,
  keyword,
}: {
  id: string;
  enabled: boolean;
  keyword: string;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <label className="admin-toggle" aria-busy={pending}>
      <input
        type="checkbox"
        checked={enabled}
        disabled={pending}
        onChange={() => {
          const next = !enabled;
          startTransition(async () => {
            await toggleSensitiveWord(id, next);
          });
        }}
        aria-label={`${enabled ? "停用" : "启用"}敏感词 ${keyword}`}
      />
      <span className="track" />
      <span className="thumb" />
    </label>
  );
}
