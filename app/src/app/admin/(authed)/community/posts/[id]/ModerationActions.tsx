"use client";

import { useState, useTransition } from "react";
import { moderatePost, approveByAi } from "@/lib/actions/community";

const ACTIONS: Array<{
  value: "approve" | "reject" | "hide" | "feature" | "unfeature";
  label: string;
  tone: "primary" | "danger" | "ghost";
}> = [
  { value: "approve", label: "通过", tone: "primary" },
  { value: "feature", label: "设为精选", tone: "primary" },
  { value: "unfeature", label: "取消精选", tone: "ghost" },
  { value: "reject", label: "驳回", tone: "danger" },
  { value: "hide", label: "隐藏", tone: "ghost" },
];

export function ModerationActions({
  postId,
  currentStatus,
  aiReviewResult,
}: {
  postId: string;
  currentStatus: string;
  aiReviewResult?: string | null;
}) {
  const [pending, start] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackOk, setFeedbackOk] = useState(false);

  // Override dialog state: null = closed, else the action that triggered it
  const [overrideAction, setOverrideAction] = useState<
    "approve" | "reject" | "hide" | "feature" | "unfeature" | null
  >(null);
  const [overrideReason, setOverrideReason] = useState("");
  const [rejectReason, setRejectReason] = useState("");

  // Detect if a human action conflicts with AI result
  function isConflict(action: "approve" | "reject" | "hide" | "feature" | "unfeature") {
    if (!aiReviewResult) return false;
    if (action === "approve" || action === "feature" || action === "unfeature") {
      return aiReviewResult === "reject";
    }
    if (action === "reject") {
      return aiReviewResult === "pass";
    }
    return false;
  }

  function perform(action: (typeof ACTIONS)[number]) {
    const needsOverride = isConflict(action.value);
    const needsRejectReason = action.value === "reject" || action.value === "hide";

    if (needsOverride && overrideAction !== action.value) {
      setOverrideAction(action.value);
      setOverrideReason("");
      setRejectReason("");
      return;
    }
    if (needsOverride && !overrideReason.trim()) {
      setFeedback("请填写覆盖理由（与 AI 结论不同时必填）");
      setFeedbackOk(false);
      return;
    }
    if (!needsOverride && needsRejectReason && overrideAction !== action.value) {
      setOverrideAction(action.value);
      setOverrideReason("");
      setRejectReason("");
      return;
    }
    if (needsRejectReason && !rejectReason.trim()) {
      setFeedback("请填写原因");
      setFeedbackOk(false);
      return;
    }

    start(async () => {
      setFeedback(null);
      const res = await moderatePost({
        postId,
        action: action.value,
        reason: needsRejectReason ? rejectReason : undefined,
        humanOverride: needsOverride ? overrideReason : undefined,
      });
      if (res.ok) {
        setFeedback(`已${action.label}`);
        setFeedbackOk(true);
        setOverrideAction(null);
        setOverrideReason("");
        setRejectReason("");
      } else {
        setFeedback(res.error ?? "操作失败");
        setFeedbackOk(false);
      }
    });
  }

  function performApproveByAi() {
    start(async () => {
      setFeedback(null);
      const res = await approveByAi(postId);
      if (res.ok) {
        setFeedback("已按 AI 结论处理");
        setFeedbackOk(true);
        setOverrideAction(null);
      } else {
        setFeedback(res.error ?? "操作失败");
        setFeedbackOk(false);
      }
    });
  }

  const showAiApprove = !!aiReviewResult && currentStatus === "pending";

  return (
    <div className="lead-detail">
      <h2>审核动作</h2>
      <p className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
        当前：{currentStatus}
      </p>

      {showAiApprove && (
        <button
          type="button"
          className="btn-admin btn-admin--sm btn-admin--primary"
          style={{ justifyContent: "center", width: "100%", marginBottom: 8 }}
          disabled={pending}
          onClick={performApproveByAi}
        >
          认同 AI 结论
        </button>
      )}

      <div className="status-buttons" style={{ flexDirection: "column" }}>
        {ACTIONS.map((a) => {
          const conflict = isConflict(a.value);
          return (
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
              {conflict ? " ⚠ 与 AI 相反" : ""}
              {overrideAction === a.value ? " · 请填写理由后再次点击" : ""}
            </button>
          );
        })}
      </div>

      {overrideAction !== null && (
        <div style={{ marginTop: 12 }}>
          {isConflict(overrideAction) && (
            <div style={{ marginBottom: 8 }}>
              <label
                style={{
                  fontSize: 13,
                  color: "var(--warning-700)",
                  marginBottom: 6,
                  display: "block",
                  fontWeight: 500,
                }}
              >
                覆盖理由（必填，与 AI 结论不同）
              </label>
              <textarea
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                rows={2}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  border: "1px solid var(--warning-500)",
                  borderRadius: 8,
                  fontSize: 14,
                  fontFamily: "var(--font-sans)",
                }}
                placeholder="说明为什么与 AI 结论不同（将记录到审计日志）"
              />
            </div>
          )}
          {(overrideAction === "reject" || overrideAction === "hide") && (
            <div>
              <label
                style={{
                  fontSize: 13,
                  color: "var(--gray-600)",
                  marginBottom: 6,
                  display: "block",
                }}
              >
                {overrideAction === "reject" ? "驳回原因" : "隐藏原因"}
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
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
          )}
        </div>
      )}

      {feedback ? (
        <div
          style={{
            marginTop: 10,
            padding: "8px 12px",
            background: feedbackOk ? "var(--success-50)" : "var(--danger-50)",
            color: feedbackOk ? "var(--success-700)" : "var(--danger-700)",
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
