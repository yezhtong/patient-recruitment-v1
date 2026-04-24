"use client";

import { useTransition, useState, useRef } from "react";
import { toggleMediaEnabled, updateMediaOverlay } from "@/lib/actions/media";

export function MediaCardActions({
  id,
  isEnabled,
  url,
  category,
  overlayLabel: initLabel,
  overlayText: initText,
}: {
  id: string;
  isEnabled: boolean;
  url: string;
  category: string;
  overlayLabel?: string | null;
  overlayText?: string | null;
}) {
  const [pending, start] = useTransition();
  const [copied, setCopied] = useState(false);

  // overlay state
  const [overlayPending, startOverlay] = useTransition();
  const [overlayMsg, setOverlayMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const labelRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLInputElement>(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // noop
    }
  };

  const handleOverlaySave = () => {
    const label = labelRef.current?.value.trim() ?? null;
    const text = textRef.current?.value.trim() ?? null;
    startOverlay(async () => {
      const res = await updateMediaOverlay(id, label || null, text || null);
      if (res.ok) {
        setOverlayMsg({ ok: true, text: "保存成功" });
      } else {
        setOverlayMsg({ ok: false, text: res.error });
      }
      setTimeout(() => setOverlayMsg(null), 2500);
    });
  };

  return (
    <>
      {category === "hero" && (
        <details
          style={{
            marginTop: 8,
            marginBottom: 4,
            background: "var(--cream-100, #faf8f4)",
            border: "1px solid var(--ink-200)",
            borderRadius: "var(--r-sm)",
            padding: "6px 10px",
          }}
        >
          <summary
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--ink-700, #374151)",
              cursor: "pointer",
              userSelect: "none",
              listStyle: "none",
            }}
          >
            编辑 Overlay 文案
          </summary>
          <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
            <label style={{ display: "block" }}>
              <span
                style={{
                  display: "block",
                  fontSize: 10,
                  fontWeight: 600,
                  color: "var(--gray-600)",
                  marginBottom: 3,
                }}
              >
                标题（上限 24 字）
              </span>
              <input
                ref={labelRef}
                type="text"
                defaultValue={initLabel ?? ""}
                maxLength={24}
                placeholder="如：真实研究中心"
                style={{
                  width: "100%",
                  padding: "5px 8px",
                  fontSize: 12,
                  border: "1.5px solid var(--ink-200)",
                  borderRadius: "var(--r-sm)",
                  background: "var(--cream-0)",
                  fontFamily: "var(--font-sans)",
                  boxSizing: "border-box",
                }}
              />
            </label>
            <label style={{ display: "block" }}>
              <span
                style={{
                  display: "block",
                  fontSize: 10,
                  fontWeight: 600,
                  color: "var(--gray-600)",
                  marginBottom: 3,
                }}
              >
                副文本（上限 40 字）
              </span>
              <input
                ref={textRef}
                type="text"
                defaultValue={initText ?? ""}
                maxLength={40}
                placeholder="如：北京协和医院 · 乳腺肿瘤门诊"
                style={{
                  width: "100%",
                  padding: "5px 8px",
                  fontSize: 12,
                  border: "1.5px solid var(--ink-200)",
                  borderRadius: "var(--r-sm)",
                  background: "var(--cream-0)",
                  fontFamily: "var(--font-sans)",
                  boxSizing: "border-box",
                }}
              />
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                type="button"
                onClick={handleOverlaySave}
                disabled={overlayPending}
                style={{
                  padding: "4px 12px",
                  fontSize: 11,
                  border: "1px solid var(--ink-400, #9ca3af)",
                  borderRadius: "var(--r-sm)",
                  background: "var(--ink-900)",
                  color: "var(--cream-50, #fafaf9)",
                  cursor: overlayPending ? "not-allowed" : "pointer",
                  opacity: overlayPending ? 0.6 : 1,
                  fontFamily: "var(--font-sans)",
                  fontWeight: 600,
                }}
              >
                {overlayPending ? "保存中…" : "保存"}
              </button>
              {overlayMsg && (
                <span
                  style={{
                    fontSize: 11,
                    color: overlayMsg.ok ? "var(--success-700)" : "var(--danger-700)",
                  }}
                >
                  {overlayMsg.ok ? "✓ " : "⚠ "}
                  {overlayMsg.text}
                </span>
              )}
            </div>
          </div>
        </details>
      )}
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button
          type="button"
          onClick={handleCopy}
          style={{
            flex: 1,
            padding: "4px 10px",
            fontSize: 11,
            border: "1px solid var(--ink-200)",
            borderRadius: "var(--r-sm)",
            background: "var(--cream-0)",
            cursor: "pointer",
            fontFamily: "var(--font-mono)",
          }}
        >
          {copied ? "✓ 已复制" : "复制 URL"}
        </button>
        <button
          type="button"
          onClick={() => start(() => toggleMediaEnabled(id))}
          disabled={pending}
          style={{
            padding: "4px 10px",
            fontSize: 11,
            border: "1px solid var(--ink-200)",
            borderRadius: "var(--r-sm)",
            background: isEnabled ? "var(--cream-0)" : "var(--success-50)",
            color: isEnabled ? "var(--gray-700)" : "var(--success-700)",
            cursor: pending ? "not-allowed" : "pointer",
            opacity: pending ? 0.6 : 1,
            fontFamily: "var(--font-mono)",
          }}
        >
          {pending ? "…" : isEnabled ? "下架" : "启用"}
        </button>
      </div>
    </>
  );
}
