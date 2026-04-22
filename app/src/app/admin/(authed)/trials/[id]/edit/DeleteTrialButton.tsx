"use client";

import { useTransition } from "react";
import { deleteTrial } from "@/lib/actions/trials";

export function DeleteTrialButton({ id, title }: { id: string; title: string }) {
  const [pending, start] = useTransition();

  function onClick() {
    if (!confirm(`确认删除试验 "${title}"？此操作会级联删除该试验的全部线索。`)) return;
    start(async () => {
      await deleteTrial(id);
    });
  }

  return (
    <button
      type="button"
      className="btn-admin btn-admin--danger"
      onClick={onClick}
      disabled={pending}
    >
      {pending ? "删除中…" : "删除试验"}
    </button>
  );
}
