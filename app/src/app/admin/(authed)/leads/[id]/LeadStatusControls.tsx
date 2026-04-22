"use client";

import { useState, useTransition } from "react";
import { setLeadStatus, updateLeadStatus } from "@/lib/actions/leads";
import type { NewLeadStatus } from "@/lib/actions/leads";
import { LEAD_STATUS_LABEL } from "@/lib/constants/lead-status";

const STATUSES: Array<{
  value: NewLeadStatus;
  label: string;
}> = [
  { value: "submitted", label: "已提交" },
  { value: "in_review", label: "预筛审核" },
  { value: "contacted", label: "已联系" },
  { value: "enrolled", label: "已入组" },
  { value: "disqualified", label: "不符合" },
  { value: "closed", label: "已关闭" },
];

export function LeadStatusControls({
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
  const [feedback, setFeedback] = useState<string | null>(null);

  function quickSet(next: NewLeadStatus) {
    start(async () => {
      setFeedback(null);
      const res = await setLeadStatus(id, next);
      if (res.ok) {
        setStatus(next);
        setFeedback("已更新状态");
      } else if (res.error) {
        setFeedback(res.error);
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
        setFeedback("已保存备注");
      } else if (res.error) {
        setFeedback(res.error);
      }
    });
  }

  return (
    <div className="lead-detail">
      <h2>跟进操作</h2>
      <p className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
        当前状态：<strong>{LEAD_STATUS_LABEL[status] ?? status}</strong>
      </p>
      <div className="status-buttons">
        {STATUSES.map((s) => (
          <button
            key={s.value}
            type="button"
            className={`btn-admin btn-admin--sm ${s.value === status ? "btn-admin--primary" : ""}`}
            disabled={pending || s.value === status}
            onClick={() => quickSet(s.value)}
          >
            → {s.label}
          </button>
        ))}
      </div>

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
