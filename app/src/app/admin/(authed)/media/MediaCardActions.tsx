"use client";

import { useTransition, useState } from "react";
import { toggleMediaEnabled } from "@/lib/actions/media";

export function MediaCardActions({
  id,
  isEnabled,
  url,
}: {
  id: string;
  isEnabled: boolean;
  url: string;
}) {
  const [pending, start] = useTransition();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // noop
    }
  };

  return (
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
        {copied ? "✓ 已复制" : "📋 复制 URL"}
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
  );
}
