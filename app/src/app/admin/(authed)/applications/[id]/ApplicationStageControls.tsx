"use client";

import { useState, useTransition } from "react";
import {
  setApplicationStage,
  saveApplicationNote,
} from "@/lib/actions/applications";

type Stage =
  | "submitted"
  | "in_review"
  | "contacted"
  | "enrolled"
  | "withdrawn"
  | "closed";

const STAGES: Array<{ value: Stage; label: string }> = [
  { value: "submitted", label: "已提交" },
  { value: "in_review", label: "预筛审核" },
  { value: "contacted", label: "已联系" },
  { value: "enrolled", label: "已入组" },
  { value: "withdrawn", label: "已退出" },
  { value: "closed", label: "已关闭" },
];

export function ApplicationStageControls({
  id,
  currentStage,
  currentNextAction,
  currentNote,
}: {
  id: string;
  currentStage: Stage;
  currentNextAction: string | null;
  currentNote: string | null;
}) {
  const [stage, setStage] = useState<Stage>(currentStage);
  const [nextAction, setNextAction] = useState(currentNextAction ?? "");
  const [note, setNote] = useState(currentNote ?? "");
  const [pending, start] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  function quickSet(next: Stage) {
    start(async () => {
      setFeedback(null);
      const res = await setApplicationStage(id, next, nextAction || undefined);
      if (res.ok) {
        setStage(next);
        setFeedback("阶段已更新，患者端同步刷新");
      } else if (res.error) {
        setFeedback(res.error);
      }
    });
  }

  async function onSave(fd: FormData) {
    start(async () => {
      setFeedback(null);
      fd.set("id", id);
      const res = await saveApplicationNote({}, fd);
      if (res.ok) {
        setFeedback("已保存");
      } else if (res.error) {
        setFeedback(res.error);
      }
    });
  }

  return (
    <div className="lead-detail">
      <h2>阶段流转</h2>
      <p className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
        当前阶段：<strong>{STAGES.find((s) => s.value === stage)?.label}</strong>
      </p>
      <div className="status-buttons">
        {STAGES.map((s) => (
          <button
            key={s.value}
            type="button"
            className={`btn-admin btn-admin--sm ${s.value === stage ? "btn-admin--primary" : ""}`}
            disabled={pending || s.value === stage}
            onClick={() => quickSet(s.value)}
          >
            → {s.label}
          </button>
        ))}
      </div>

      <form action={onSave} className="admin-form" style={{ marginTop: 20, gap: 10 }}>
        <div className="field">
          <label htmlFor="nextAction">下一步（患者端可见）</label>
          <textarea
            id="nextAction"
            name="nextAction"
            rows={2}
            value={nextAction}
            onChange={(e) => setNextAction(e.target.value)}
            placeholder="例：等待研究中心安排面诊，预计 3 个工作日内联系"
          />
        </div>
        <div className="field">
          <label htmlFor="note">运营内部备注（仅后台可见）</label>
          <textarea
            id="note"
            name="note"
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        <div className="form-actions">
          <button type="submit" className="btn-admin btn-admin--primary" disabled={pending}>
            {pending ? "保存中…" : "保存"}
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
