"use client";

import { useActionState } from "react";
import Link from "next/link";
import { unlockAccount, rejectAppeal, type LockActionState } from "@/lib/actions/locks";

const INITIAL: LockActionState = { status: "idle" };

export function LockActionPanel({
  lockId,
  hasAppeal,
  alreadyUnlocked,
}: {
  lockId: string;
  hasAppeal: boolean;
  alreadyUnlocked: boolean;
}) {
  const [unlockState, unlockAction, unlockPending] = useActionState(
    unlockAccount,
    INITIAL,
  );
  const [rejectState, rejectAction, rejectPending] = useActionState(
    rejectAppeal,
    INITIAL,
  );

  if (alreadyUnlocked) {
    return (
      <div
        style={{
          padding: "16px 20px",
          background: "var(--success-50)",
          border: "1px solid var(--success-500)",
          borderRadius: "var(--r-md)",
          color: "var(--success-700)",
          fontSize: "var(--fs-sm)",
        }}
      >
        ✓ 该账号已解锁，无需进一步操作。
        <Link href="/admin/locks" style={{ color: "var(--success-700)", marginLeft: 12, textDecoration: "underline" }}>
          返回列表
        </Link>
      </div>
    );
  }

  const defaultApproveText =
    "你好，经核实，你的账号浏览行为属于正常对比，现已解除限制。感谢你的配合，欢迎继续使用九泰临研。";
  const defaultRejectText =
    "你好，经核实，你的账号在短时间内访问了大量内容，暂不符合正常浏览模式。如有补充信息，可再次拨打客服电话 400-888-1688。";

  return (
    <div style={{ display: "grid", gap: 20 }}>
      {/* 解锁表单 */}
      <form action={unlockAction} style={{ padding: 20, background: "var(--cream-0)", border: "var(--border)", borderRadius: "var(--r-md)" }}>
        <input type="hidden" name="lockId" value={lockId} />
        <h4 style={{ fontFamily: "var(--font-serif)", fontWeight: 400, fontSize: 20, marginBottom: 10 }}>
          ✓ 解锁并回复用户
        </h4>
        <p style={{ fontSize: "var(--fs-sm)", color: "var(--gray-600)", marginBottom: 12 }}>
          确认无误后解锁；回复内容会展示给用户。操作会写入审计日志。
        </p>
        <textarea
          name="replyText"
          defaultValue={defaultApproveText}
          rows={4}
          required
          minLength={5}
          maxLength={500}
          style={{
            width: "100%",
            border: "1.5px solid var(--ink-200)",
            borderRadius: "var(--r-md)",
            padding: "10px 14px",
            fontFamily: "var(--font-sans)",
            fontSize: "var(--fs-sm)",
            lineHeight: 1.6,
            resize: "vertical",
          }}
        />
        {unlockState.status === "error" ? (
          <p style={{ color: "var(--danger-700)", fontSize: "var(--fs-sm)", marginTop: 8 }}>⚠ {unlockState.message}</p>
        ) : null}
        {unlockState.status === "ok" ? (
          <p style={{ color: "var(--success-700)", fontSize: "var(--fs-sm)", marginTop: 8 }}>✓ {unlockState.message}</p>
        ) : null}
        <div style={{ marginTop: 12 }}>
          <button
            type="submit"
            className="btn btn--primary"
            disabled={unlockPending}
            style={{ minHeight: 44 }}
          >
            {unlockPending ? "处理中…" : "确认解锁并发送回复"}
          </button>
        </div>
      </form>

      {/* 驳回表单（仅在有申诉且尚未处理时展示） */}
      {hasAppeal ? (
        <form action={rejectAction} style={{ padding: 20, background: "var(--cream-0)", border: "var(--border)", borderRadius: "var(--r-md)" }}>
          <input type="hidden" name="lockId" value={lockId} />
          <h4 style={{ fontFamily: "var(--font-serif)", fontWeight: 400, fontSize: 20, marginBottom: 10 }}>
            ⊘ 驳回申诉（保持锁定）
          </h4>
          <p style={{ fontSize: "var(--fs-sm)", color: "var(--gray-600)", marginBottom: 12 }}>
            驳回后用户看到回复文案，账号继续锁定。不允许二次申诉（用户拍板 · 默认）。
          </p>
          <textarea
            name="replyText"
            defaultValue={defaultRejectText}
            rows={4}
            required
            minLength={5}
            maxLength={500}
            style={{
              width: "100%",
              border: "1.5px solid var(--ink-200)",
              borderRadius: "var(--r-md)",
              padding: "10px 14px",
              fontFamily: "var(--font-sans)",
              fontSize: "var(--fs-sm)",
              lineHeight: 1.6,
              resize: "vertical",
            }}
          />
          {rejectState.status === "error" ? (
            <p style={{ color: "var(--danger-700)", fontSize: "var(--fs-sm)", marginTop: 8 }}>⚠ {rejectState.message}</p>
          ) : null}
          {rejectState.status === "ok" ? (
            <p style={{ color: "var(--success-700)", fontSize: "var(--fs-sm)", marginTop: 8 }}>✓ {rejectState.message}</p>
          ) : null}
          <div style={{ marginTop: 12 }}>
            <button
              type="submit"
              disabled={rejectPending}
              style={{
                minHeight: 44,
                padding: "0 20px",
                background: "var(--danger-500)",
                color: "white",
                border: 0,
                borderRadius: "var(--r-md)",
                fontWeight: 600,
                cursor: rejectPending ? "not-allowed" : "pointer",
                opacity: rejectPending ? 0.6 : 1,
              }}
            >
              {rejectPending ? "处理中…" : "确认驳回"}
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
