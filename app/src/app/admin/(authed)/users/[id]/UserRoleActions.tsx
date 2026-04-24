"use client";

import { useTransition, useState } from "react";
import { assignDoctorRole, revokeDoctorRole } from "@/lib/actions/users";

export function UserRoleActions({
  userId,
  displayName,
  role,
  isSystemAi,
}: {
  userId: string;
  displayName: string;
  role: string;
  isSystemAi: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  if (isSystemAi) {
    return (
      <div
        style={{
          padding: "8px 14px",
          background: "var(--cream-100, #f5f0eb)",
          border: "var(--border)",
          borderRadius: "var(--r-md)",
          fontSize: "var(--fs-sm)",
          color: "var(--gray-500)",
        }}
      >
        AI 账号角色不可变更
      </div>
    );
  }

  const isDoctor = role === "doctor";

  function handleClick() {
    const label = isDoctor ? displayName : displayName;
    const msg = isDoctor
      ? `确认撤销 ${label} 的医生身份？`
      : `确认将 ${label} 标记为医生？医生身份将在帖子/评论显示绿色徽章`;
    if (!confirm(msg)) return;
    setMessage(null);
    startTransition(async () => {
      const res = isDoctor
        ? await revokeDoctorRole(userId)
        : await assignDoctorRole(userId);
      if (res.ok) {
        setMessage({ ok: true, text: isDoctor ? "已撤销医生身份" : "已设为医生" });
      } else {
        setMessage({ ok: false, text: res.error });
      }
    });
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
      <button
        type="button"
        className={isDoctor ? "btn" : "btn btn--primary"}
        disabled={pending}
        onClick={handleClick}
        style={{ minHeight: 38 }}
      >
        {pending ? "处理中…" : isDoctor ? "取消医生" : "设为医生"}
      </button>
      {message && (
        <span
          style={{
            fontSize: "var(--fs-sm)",
            color: message.ok ? "var(--success-700)" : "var(--danger-700)",
          }}
        >
          {message.ok ? "✓" : "⚠"} {message.text}
        </span>
      )}
    </div>
  );
}
