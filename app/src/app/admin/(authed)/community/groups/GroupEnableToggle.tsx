"use client";

import { useTransition } from "react";
import { toggleCommunityGroup } from "@/lib/actions/community-groups";

export default function GroupEnableToggle({
  id,
  enabled,
  name,
}: {
  id: string;
  enabled: boolean;
  name: string;
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
            await toggleCommunityGroup(id, next);
          });
        }}
        aria-label={`${enabled ? "停用" : "启用"}分区 ${name}`}
      />
      <span className="track" />
      <span className="thumb" />
    </label>
  );
}
