"use client";

import { useActionState } from "react";
import type { SensitiveWordFormState } from "@/lib/actions/sensitive-words";

interface Props {
  action: (prev: SensitiveWordFormState, fd: FormData) => Promise<SensitiveWordFormState>;
  initial?: {
    keyword?: string;
    riskType?: string;
    riskLevel?: string;
    isEnabled?: boolean;
    note?: string | null;
  };
  submitLabel: string;
}

const RISK_TYPES = [
  { value: "contact", label: "联系方式" },
  { value: "drug-sale", label: "药品推销" },
  { value: "enroll-promise", label: "入组承诺" },
  { value: "quackery", label: "伪医疗" },
  { value: "ad", label: "广告" },
];
const RISK_LEVELS = [
  { value: "high", label: "高（直接拦截发布）" },
  { value: "medium", label: "中（转审核）" },
  { value: "low", label: "低（仅记录）" },
];

export default function SensitiveWordForm({ action, initial, submitLabel }: Props) {
  const [state, formAction, pending] = useActionState(action, {} as SensitiveWordFormState);

  return (
    <form action={formAction} className="admin-form">
      <fieldset>
        <legend>词条</legend>
        {state?.error && <div className="error">{state.error}</div>}
        {state?.ok && (
          <div style={{ background: "var(--success-50)", color: "var(--success-700)", padding: "10px 14px", borderRadius: 8, fontSize: 14 }}>
            已保存（运行中扫描会在 60 秒内加载新词）
          </div>
        )}
        <div className="field">
          <label htmlFor="keyword">关键词 *</label>
          <input id="keyword" name="keyword" required defaultValue={initial?.keyword ?? ""} maxLength={50} style={{ fontFamily: "var(--font-mono)" }} />
        </div>
        <div className="row2">
          <div className="field">
            <label htmlFor="riskType">类型 *</label>
            <select id="riskType" name="riskType" required defaultValue={initial?.riskType ?? "contact"}>
              {RISK_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="riskLevel">级别 *</label>
            <select id="riskLevel" name="riskLevel" required defaultValue={initial?.riskLevel ?? "medium"}>
              {RISK_LEVELS.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="field">
          <label htmlFor="note">备注</label>
          <textarea id="note" name="note" defaultValue={initial?.note ?? ""} maxLength={200} placeholder="（可选）为何收录这个词、适用场景" />
        </div>
        <div className="checkrow">
          <label>
            <input type="checkbox" name="isEnabled" defaultChecked={initial?.isEnabled ?? true} />
            启用（停用后扫描不生效）
          </label>
        </div>
      </fieldset>

      <div className="form-actions">
        <button type="submit" className="btn-admin btn-admin--primary" disabled={pending}>
          {pending ? "保存中…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
