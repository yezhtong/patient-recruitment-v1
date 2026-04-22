"use client";

import { useTransition } from "react";
import { deleteFaq } from "@/lib/actions/faq";

export default function DeleteFaqButton({ id, question }: { id: string; question: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      className="btn-admin btn-admin--danger"
      disabled={pending}
      onClick={() => {
        if (!window.confirm(`确定删除 FAQ「${question.slice(0, 30)}」？此操作不可撤销。`)) return;
        startTransition(() => {
          void deleteFaq(id);
        });
      }}
    >
      {pending ? "删除中…" : "删除"}
    </button>
  );
}
