"use client";

import { useState, useTransition } from "react";
import { deleteCommunityGroup } from "@/lib/actions/community-groups";

export default function DeleteGroupButton({
  id,
  name,
  postCount,
}: {
  id: string;
  name: string;
  postCount: number;
}) {
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const disabled = postCount > 0 || pending;

  return (
    <>
      <button
        type="button"
        className="btn-admin btn-admin--danger"
        disabled={disabled}
        title={postCount > 0 ? `该分区有 ${postCount} 条帖子，无法删除` : undefined}
        onClick={() => {
          if (!window.confirm(`确定删除分区「${name}」？此操作不可撤销。`)) return;
          setErr(null);
          startTransition(async () => {
            const res = await deleteCommunityGroup(id);
            if (res?.error) {
              setErr(res.error);
            } else {
              window.location.assign("/admin/community/groups");
            }
          });
        }}
      >
        {pending ? "删除中…" : "删除"}
      </button>
      {err && (
        <div style={{ marginTop: 8, color: "var(--danger-700)", fontSize: 13 }}>{err}</div>
      )}
    </>
  );
}
