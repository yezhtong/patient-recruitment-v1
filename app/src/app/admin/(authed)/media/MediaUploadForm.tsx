"use client";

import { useActionState, useRef } from "react";
import { uploadMediaAsset, type MediaUploadState } from "@/lib/actions/media";

const INITIAL: MediaUploadState = { status: "idle" };

const CATEGORIES: { value: string; label: string }[] = [
  { value: "hero", label: "首页 Hero" },
  { value: "community", label: "社区头图" },
  { value: "trial", label: "试验配图" },
  { value: "faq", label: "FAQ 配图" },
  { value: "avatar", label: "头像占位" },
];

export function MediaUploadForm() {
  const [state, action, pending] = useActionState(uploadMediaAsset, INITIAL);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={(fd) => {
        action(fd);
        // 成功态由 useActionState 驱动，这里不立即 reset，以便展示 URL
      }}
      style={{
        padding: 24,
        background: "var(--cream-0)",
        border: "2px dashed var(--ink-200)",
        borderRadius: "var(--r-lg)",
        marginBottom: 28,
      }}
    >
      <h3 style={{ fontFamily: "var(--font-serif)", fontWeight: 400, fontSize: 22, marginBottom: 8 }}>
        上传新素材
      </h3>
      <p style={{ fontSize: "var(--fs-sm)", color: "var(--gray-600)", marginBottom: 16 }}>
        支持 JPG / PNG / WebP / GIF · 单文件 ≤ 2 MB · 上传后会在前台引用位置立即生效。
      </p>
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
        <label style={{ display: "block" }}>
          <span style={{ display: "block", fontSize: "var(--fs-sm)", fontWeight: 600, marginBottom: 6 }}>
            分类 <span style={{ color: "var(--accent)" }}>*</span>
          </span>
          <select
            name="category"
            required
            defaultValue="hero"
            style={{
              width: "100%",
              padding: "10px 14px",
              border: "1.5px solid var(--ink-200)",
              borderRadius: "var(--r-md)",
              background: "var(--cream-0)",
              fontFamily: "var(--font-sans)",
              fontSize: "var(--fs-sm)",
            }}
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: "block" }}>
          <span style={{ display: "block", fontSize: "var(--fs-sm)", fontWeight: 600, marginBottom: 6 }}>
            备注（可选）
          </span>
          <input
            name="note"
            type="text"
            maxLength={200}
            placeholder="例如：首页 2026-04 活动 banner"
            style={{
              width: "100%",
              padding: "10px 14px",
              border: "1.5px solid var(--ink-200)",
              borderRadius: "var(--r-md)",
              background: "var(--cream-0)",
              fontFamily: "var(--font-sans)",
              fontSize: "var(--fs-sm)",
            }}
          />
        </label>
      </div>
      <div style={{ marginTop: 14 }}>
        <label style={{ display: "block" }}>
          <span style={{ display: "block", fontSize: "var(--fs-sm)", fontWeight: 600, marginBottom: 6 }}>
            图片文件 <span style={{ color: "var(--accent)" }}>*</span>
          </span>
          <input
            type="file"
            name="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            required
            style={{ fontSize: "var(--fs-sm)" }}
          />
        </label>
      </div>
      {state.status === "error" ? (
        <p style={{ color: "var(--danger-700)", fontSize: "var(--fs-sm)", marginTop: 12 }}>⚠ {state.message}</p>
      ) : null}
      {state.status === "ok" ? (
        <p style={{ color: "var(--success-700)", fontSize: "var(--fs-sm)", marginTop: 12 }}>
          ✓ {state.message} · URL：<code style={{ fontFamily: "var(--font-mono)" }}>{state.url}</code>
        </p>
      ) : null}
      <div style={{ marginTop: 16 }}>
        <button
          type="submit"
          disabled={pending}
          className="btn btn--primary"
          style={{ minHeight: 44 }}
        >
          {pending ? "上传中…" : "⬆ 上传"}
        </button>
      </div>
    </form>
  );
}
