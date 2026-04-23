"use client";

import { useState, useCallback } from "react";

export function GenerateFormDialog({
  trialId,
  formId,
  onGenerated,
}: {
  trialId: string;
  formId: string;
  onGenerated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    if (!text.trim()) {
      setError("请贴入招募广告文本");
      return;
    }

    if (text.length > 4000) {
      setError("请精简到 4000 字以内或分段生成");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/trials/${trialId}/generate-form`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adText: text }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        itemCount?: number;
        fieldKeys?: string[];
      };

      if (!res.ok || !data.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      onGenerated();
      setOpen(false);
      setText("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "AI 生成失败，请稍后重试或手动创建字段",
      );
    } finally {
      setLoading(false);
    }
  }, [text, trialId, onGenerated]);

  if (!open) {
    return (
      <button className="btn-admin" onClick={() => setOpen(true)}>
        🤖 AI 生成初版
      </button>
    );
  }

  return (
    <div className="modal-overlay" onClick={() => !loading && setOpen(false)}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>AI 生成预筛表单</h2>
          <button
            className="modal-close"
            onClick={() => !loading && setOpen(false)}
            disabled={loading}
          >
            ×
          </button>
        </div>

        <div className="modal-body">
          {/* 警告提示 */}
          <div className="modal-notice">
            <strong>⚠️ 提示</strong>：AI
            生成的字段仅供参考，请务必根据实际招募方案人工复核后再发布。医疗问诊相关字段的准确性由运营方负责。
          </div>

          {/* 文本输入 */}
          <label className="textarea-label">
            <span>
              招募广告原文
              <span className="required">*</span>
            </span>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="贴入试验招募广告全文或相关入排标准…"
              rows={10}
              disabled={loading}
              maxLength={4000}
            />
            <div className="char-count">
              {text.length} / 4000
            </div>
          </label>

          {/* 错误提示 */}
          {error && <div className="error-box">{error}</div>}
        </div>

        <div className="modal-footer">
          <button
            className="btn-admin btn-admin--primary"
            onClick={handleGenerate}
            disabled={!text.trim() || loading}
          >
            {loading
              ? "🔄 AI 正在分析（约 20-30 秒）…"
              : "开始生成"}
          </button>
          <button
            className="btn-admin btn-admin--ghost"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
}
