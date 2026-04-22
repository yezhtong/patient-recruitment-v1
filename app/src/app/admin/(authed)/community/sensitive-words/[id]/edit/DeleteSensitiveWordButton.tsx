"use client";

import { useState, useTransition } from "react";
import { deleteSensitiveWord } from "@/lib/actions/sensitive-words";

export default function DeleteSensitiveWordButton({ id, keyword }: { id: string; keyword: string }) {
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  return (
    <>
      <button
        type="button"
        className="btn-admin btn-admin--danger"
        disabled={pending}
        onClick={() => {
          if (!window.confirm(`确定删除敏感词「${keyword}」？此操作不可撤销。`)) return;
          setErr(null);
          startTransition(async () => {
            const res = await deleteSensitiveWord(id);
            if (res?.error) setErr(res.error);
            else window.location.assign("/admin/community/sensitive-words");
          });
        }}
      >
        {pending ? "删除中…" : "删除"}
      </button>
      {err && <div style={{ marginTop: 8, color: "var(--danger-700)", fontSize: 13 }}>{err}</div>}
    </>
  );
}
