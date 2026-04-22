"use client";

import { useActionState } from "react";
import type { FaqFormState } from "@/lib/actions/faq";

interface Props {
  action: (prev: FaqFormState, fd: FormData) => Promise<FaqFormState>;
  initial?: {
    slug?: string;
    question?: string;
    answer?: string;
    category?: string;
    tags?: string | null;
    order?: number;
    isPublished?: boolean;
  };
  submitLabel: string;
}

const CATEGORIES = [
  { value: "general", label: "基础问题" },
  { value: "trial-process", label: "试验流程" },
  { value: "safety", label: "安全与风险" },
  { value: "privacy", label: "隐私保护" },
  { value: "costs", label: "费用与医保" },
  { value: "enrollment", label: "报名与入组" },
  { value: "withdraw", label: "退出与权利" },
];

export default function FaqForm({ action, initial, submitLabel }: Props) {
  const [state, formAction, pending] = useActionState(action, {} as FaqFormState);

  return (
    <form action={formAction} className="admin-form">
      <fieldset>
        <legend>内容</legend>
        {state?.error && <div className="error">{state.error}</div>}
        {state?.ok && (
          <div style={{ background: "var(--success-50)", color: "var(--success-700)", padding: "10px 14px", borderRadius: 8, fontSize: 14 }}>
            已保存
          </div>
        )}
        <div className="field">
          <label htmlFor="question">问题 *</label>
          <input id="question" name="question" required defaultValue={initial?.question ?? ""} maxLength={200} />
        </div>
        <div className="field">
          <label htmlFor="answer">答案 *</label>
          <textarea id="answer" name="answer" required defaultValue={initial?.answer ?? ""} maxLength={5000} style={{ minHeight: 200 }} />
        </div>
      </fieldset>

      <fieldset>
        <legend>元信息</legend>
        <div className="row2">
          <div className="field">
            <label htmlFor="slug">slug</label>
            <input id="slug" name="slug" defaultValue={initial?.slug ?? ""} pattern="[a-z0-9-]+" placeholder="留空自动生成 faq-xxxxxx，或自定义如 enrollment-refund-rules" />
          </div>
          <div className="field">
            <label htmlFor="category">分类 *</label>
            <select id="category" name="category" required defaultValue={initial?.category ?? "general"}>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="row2">
          <div className="field">
            <label htmlFor="tags">标签</label>
            <input id="tags" name="tags" defaultValue={initial?.tags ?? ""} placeholder="逗号分隔，如 高血压,糖尿病" />
          </div>
          <div className="field">
            <label htmlFor="order">排序</label>
            <input id="order" name="order" type="number" min={0} max={10000} defaultValue={initial?.order ?? 100} />
          </div>
        </div>
        <div className="checkrow">
          <label>
            <input type="checkbox" name="isPublished" defaultChecked={initial?.isPublished ?? true} />
            立即发布
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
