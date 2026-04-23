"use client";

import { useActionState } from "react";
import { bulkImportSensitiveWords, type BulkImportResult } from "@/lib/actions/sensitive-words";

export default function BulkImportForm() {
  const [state, formAction, pending] = useActionState<BulkImportResult | null, FormData>(
    bulkImportSensitiveWords,
    null,
  );

  return (
    <form action={formAction} className="admin-form">
      <fieldset>
        <legend>粘贴词库内容</legend>
        <div className="admin-codeblock">
          {"# 示例：\nhigh|contact|加我微信\nmedium|quackery|祖传秘方\nlow|ad|免费体验"}
        </div>
        <div className="field">
          <label htmlFor="content">内容 *</label>
          <textarea
            id="content"
            name="content"
            required
            style={{ minHeight: 320, fontFamily: "var(--font-mono)" }}
            placeholder="每行一条，level|type|keyword"
          />
        </div>
        {state && (
          <div
            style={{
              background: state.failed === 0 ? "var(--success-50)" : "var(--warning-50)",
              color: state.failed === 0 ? "var(--success-700)" : "var(--warning-700)",
              padding: "10px 14px",
              borderRadius: 8,
              fontSize: 14,
            }}
          >
            <strong>
              新增 {state.created} / 更新 {state.updated} / 失败 {state.failed} 条
            </strong>
            {state.errors.length > 0 && (
              <ul style={{ margin: "8px 0 0", paddingLeft: 20 }}>
                {state.errors.slice(0, 10).map((e, i) => (
                  <li key={i} style={{ fontSize: 12 }}>{e}</li>
                ))}
                {state.errors.length > 10 && <li style={{ fontSize: 12 }}>（仅显示前 10 条）</li>}
              </ul>
            )}
          </div>
        )}
      </fieldset>

      <div className="form-actions">
        <button type="submit" className="btn-admin btn-admin--primary" disabled={pending}>
          {pending ? "导入中…" : "开始导入"}
        </button>
      </div>
    </form>
  );
}
