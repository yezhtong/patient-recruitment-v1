"use client";

import { useState, useTransition } from "react";
import { setLeadStatus, updateLeadStatus } from "@/lib/actions/leads";
import type { NewLeadStatus } from "@/lib/actions/leads";
import { LEAD_STATUS_LABEL } from "@/lib/constants/lead-status";

type NextAction = {
  value: NewLeadStatus;
  label: string;
  danger?: boolean;
};

function getNextActions(status: NewLeadStatus): NextAction[] {
  switch (status) {
    case "submitted":
      return [
        { value: "in_review", label: "标记预筛审核中" },
        { value: "disqualified", label: "标记不符合", danger: true },
      ];
    case "in_review":
      return [
        { value: "contacted", label: "标记已联系" },
        { value: "disqualified", label: "标记不符合", danger: true },
      ];
    case "contacted":
      return [
        { value: "enrolled", label: "标记已入组" },
        { value: "disqualified", label: "标记不符合", danger: true },
        { value: "closed", label: "暂关闭" },
      ];
    case "enrolled":
      return [{ value: "closed", label: "标记已关闭" }];
    default:
      return [];
  }
}

export function RecruitStatusControls({
  id,
  currentStatus,
  currentNote,
}: {
  id: string;
  currentStatus: NewLeadStatus;
  currentNote: string | null;
}) {
  const [status, setStatus] = useState(currentStatus);
  const [note, setNote] = useState(currentNote ?? "");
  const [pending, start] = useTransition();
  const [feedback, setFeedback] = useState<{ text: string; ok: boolean } | null>(null);

  const nextActions = getNextActions(status);
  const isTerminal = status === "disqualified" || status === "closed";

  function quickSet(next: NewLeadStatus) {
    start(async () => {
      setFeedback(null);
      const res = await setLeadStatus(id, next);
      if (res.ok) {
        setStatus(next);
        setFeedback({ text: `已更新状态为「${LEAD_STATUS_LABEL[next] ?? next}」`, ok: true });
      } else {
        setFeedback({ text: res.error ?? "操作失败", ok: false });
      }
    });
  }

  async function onSaveNote(fd: FormData) {
    start(async () => {
      setFeedback(null);
      fd.set("id", id);
      fd.set("status", status);
      const res = await updateLeadStatus({}, fd);
      if (res.ok) {
        setFeedback({ text: "已保存备注", ok: true });
      } else {
        setFeedback({ text: res.error ?? "保存失败", ok: false });
      }
    });
  }

  return (
    <div className="lead-detail">
      <h2>跟进操作</h2>
      <p className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
        当前状态：
        <span className={`chip chip--${status}`} style={{ marginLeft: 4 }}>
          {LEAD_STATUS_LABEL[status] ?? status}
        </span>
      </p>

      {isTerminal ? (
        <p style={{ color: "var(--gray-500)", fontSize: 13, marginTop: 12 }}>
          该线索已终止（{LEAD_STATUS_LABEL[status]}），无可推进操作。
        </p>
      ) : (
        <div className="status-buttons">
          {nextActions.map((a) => (
            <button
              key={a.value}
              type="button"
              className={`btn-admin btn-admin--sm${a.danger ? " btn-admin--danger" : " btn-admin--primary"}`}
              disabled={pending}
              onClick={() => quickSet(a.value)}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}

      <form
        action={onSaveNote}
        className="admin-form"
        style={{ marginTop: 20, gap: 10 }}
      >
        <div className="field">
          <label htmlFor="note">运营备注</label>
          <textarea
            id="note"
            name="note"
            rows={4}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="例：已电话沟通，患者同意周三到院面诊"
          />
        </div>
        <div className="form-actions">
          <button type="submit" className="btn-admin btn-admin--primary" disabled={pending}>
            {pending ? "保存中…" : "保存备注"}
          </button>
        </div>
      </form>

      {feedback ? (
        <div
          style={{
            marginTop: 10,
            padding: "8px 12px",
            background: feedback.ok ? "var(--success-50)" : "var(--danger-50)",
            color: feedback.ok ? "var(--success-700)" : "var(--danger-700)",
            borderRadius: 8,
            fontSize: 13,
          }}
        >
          {feedback.text}
        </div>
      ) : null}
    </div>
  );
}
