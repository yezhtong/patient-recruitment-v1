"use client";

import { useState, useTransition } from "react";
import { moderatePost } from "@/lib/actions/community";

const ACTIONS: Array<{
  value: "approve" | "reject" | "hide" | "feature" | "unfeature";
  label: string;
  tone: "primary" | "danger" | "ghost";
  needsReason?: boolean;
}> = [
  { value: "approve", label: "通过", tone: "primary" },
  { value: "feature", label: "设为精选", tone: "primary" },
  { value: "unfeature", label: "取消精选", tone: "ghost" },
  { value: "reject", label: "驳回", tone: "danger", needsReason: true },
  { value: "hide", label: "隐藏", tone: "ghost", needsReason: true },
];

export function ModerationActions({
  postId,
  currentStatus,
}: {
  postId: string;
  currentStatus: string;
}) {
  const [pending, start] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [reasonFor, setReasonFor] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  function perform(action: (typeof ACTIONS)[number]) {
    if (action.needsReason && reasonFor !== action.value) {
      setReasonFor(action.value);
      return;
    }
    if (action.needsReason && !reason.trim()) {
      setFeedback("请填写原因");
      return;
    }
    const currentReason = action.needsReason ? reason : undefined;
    start(async () => {
      setFeedback(null);
      const res = await moderatePost({
        postId,
        action: action.value,
        reason: currentReason,
      });
      if (res.ok) {
        setFeedback(`已${action.label}`);
        setReasonFor(null);
        setReason("");
      } else if (res.error) {
        setFeedback(res.error);
      }
    });
  }

  return (
    <div className="lead-detail">
      <h2>审核动作</h2>
      <p className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
        当前：{currentStatus}
      </p>
      <div className="status-buttons" style={{ flexDirection: "column" }}>
        {ACTIONS.map((a) => (
          <button
            key={a.value}
            type="button"
            className={`btn-admin btn-admin--sm ${
              a.tone === "primary"
                ? "btn-admin--primary"
                : a.tone === "danger"
                  ? "btn-admin--danger"
                  : ""
            }`}
            style={{ justifyContent: "center" }}
            disabled={pending}
            onClick={() => perform(a)}
          >
            {a.label}
            {a.needsReason && reasonFor === a.value ? " · 请先填写原因并再次点击" : ""}
          </button>
        ))}
      </div>

      {reasonFor ? (
        <div style={{ marginTop: 12 }}>
          <label
            style={{
              fontSize: 13,
              color: "var(--gray-600)",
              marginBottom: 6,
              display: "block",
            }}
          >
            {reasonFor === "reject" ? "驳回原因" : "隐藏原因"}
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            style={{
              width: "100%",
              padding: "8px 10px",
              border: "1px solid var(--ink-200)",
              borderRadius: 8,
              fontSize: 14,
              fontFamily: "var(--font-sans)",
            }}
            placeholder="说明为什么不通过（将记录到审计日志）"
          />
        </div>
      ) : null}

      {feedback ? (
        <div
          style={{
            marginTop: 10,
            padding: "8px 12px",
            background: "var(--success-50)",
            color: "var(--success-700)",
            borderRadius: 8,
            fontSize: 13,
          }}
        >
          {feedback}
        </div>
      ) : null}
    </div>
  );
}
