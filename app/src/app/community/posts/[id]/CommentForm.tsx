"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createComment } from "@/lib/actions/community";

export function CommentForm({ postId }: { postId: string }) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (content.trim().length < 2) {
      setError("评论至少 2 个字");
      return;
    }
    start(async () => {
      const res = await createComment({ postId, content: content.trim(), isAnonymous: anonymous });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      if (res.status === "pending") {
        setInfo("评论已提交，需要运营审核后才会显示给其他人。");
      } else {
        setInfo("评论已发布");
      }
      setContent("");
      router.refresh();
    });
  }

  return (
    <form className="cm-comment-form" onSubmit={submit}>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="友好回复，不要留联系方式或推广药品…"
        maxLength={1000}
      />
      <div className="actions">
        <label>
          <input
            type="checkbox"
            checked={anonymous}
            onChange={(e) => setAnonymous(e.target.checked)}
            style={{ marginRight: 6 }}
          />
          匿名回复
        </label>
        <button type="submit" className="btn btn--ink btn--sm" disabled={pending}>
          {pending ? "发布中…" : "发布评论"}
        </button>
      </div>
      {error ? (
        <div
          role="alert"
          style={{
            background: "var(--danger-50)",
            border: "1px solid var(--danger-500)",
            color: "var(--danger-700)",
            padding: "8px 12px",
            borderRadius: 8,
            fontSize: 13,
          }}
        >
          {error}
        </div>
      ) : null}
      {info ? (
        <div
          style={{
            background: "var(--lime-soft)",
            border: "1px solid var(--lime)",
            color: "var(--ink-900)",
            padding: "8px 12px",
            borderRadius: 8,
            fontSize: 13,
          }}
        >
          {info}
        </div>
      ) : null}
    </form>
  );
}
