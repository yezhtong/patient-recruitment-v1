import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin-session";
import { prisma } from "@/lib/prisma";

function fmtDateTime(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

const SCENARIO_LABELS: Record<string, string> = {
  prescreen_generate: "预筛表生成",
  match_assistant: "匹配助手",
  community_review: "社区审核",
  disease_analysis: "病情分析",
  llm_sanity: "自检",
};

function statusChipClass(status: string) {
  if (status === "success") return "chip--qualified";
  if (status === "error") return "chip--rejected";
  if (status === "timeout") return "chip--contacted";
  return "chip--closed";
}

export default async function LlmLogDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getAdminSession();
  if (session.role !== "admin") {
    redirect("/admin");
  }

  const { id } = await params;
  const log = await prisma.llmCallLog.findUnique({ where: { id } });

  if (!log) {
    notFound();
  }

  const shortId = log.id.slice(0, 8);

  return (
    <>
      <div className="admin-topbar">
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Link href="/admin/llm-logs" className="btn-admin btn-admin--sm">
            ← 返回列表
          </Link>
          <div>
            <h1 style={{ fontSize: 28 }}>
              LLM 日志 <em>/ 详情 #{shortId}</em>
            </h1>
            <p className="sub">单次大模型调用的元数据记录</p>
          </div>
        </div>
      </div>

      <div className="admin-banner admin-banner--info" style={{ marginBottom: 20 }}>
        <div className="admin-banner__body">
          日志中的手机号、身份证号等敏感信息已自动打码，原始数据不落盘。
        </div>
      </div>

      <div style={{ display: "grid", gap: 16, maxWidth: 860 }}>
        {/* 基础元信息 */}
        <div className="admin-card">
          <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 20, fontWeight: 400, margin: "0 0 16px" }}>
            基础元信息
          </h2>
          <dl className="lead-detail" style={{ border: "none", padding: 0, margin: 0 }}>
            <dt>时间</dt>
            <dd>{fmtDateTime(log.createdAt)}</dd>
            <dt>场景</dt>
            <dd>
              <span className="chip chip--type">
                {SCENARIO_LABELS[log.scenario] ?? log.scenario}
              </span>
            </dd>
            <dt>Provider</dt>
            <dd style={{ fontFamily: "var(--font-mono)" }}>{log.provider}</dd>
            <dt>Model</dt>
            <dd style={{ fontFamily: "var(--font-mono)" }}>{log.model ?? "—"}</dd>
            <dt>Operator ID</dt>
            <dd style={{ fontFamily: "var(--font-mono)" }}>{log.operatorId ?? "—"}</dd>
          </dl>
        </div>

        {/* 调用统计 */}
        <div className="admin-card">
          <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 20, fontWeight: 400, margin: "0 0 16px" }}>
            调用统计
          </h2>
          <dl className="lead-detail" style={{ border: "none", padding: 0, margin: 0 }}>
            <dt>Prompt 字符数</dt>
            <dd style={{ fontFamily: "var(--font-mono)" }}>{log.promptChars.toLocaleString()}</dd>
            <dt>Response 字符数</dt>
            <dd style={{ fontFamily: "var(--font-mono)" }}>{log.responseChars?.toLocaleString() ?? "—"}</dd>
            <dt>Prompt Tokens</dt>
            <dd style={{ fontFamily: "var(--font-mono)" }}>{log.promptTokens?.toLocaleString() ?? "—"}</dd>
            <dt>Completion Tokens</dt>
            <dd style={{ fontFamily: "var(--font-mono)" }}>{log.completionTokens?.toLocaleString() ?? "—"}</dd>
            <dt>Total Tokens</dt>
            <dd style={{ fontFamily: "var(--font-mono)" }}>{log.totalTokens?.toLocaleString() ?? "—"}</dd>
            <dt>估算费用</dt>
            <dd style={{ fontFamily: "var(--font-mono)" }}>
              {log.estimatedCostCny != null ? `¥${log.estimatedCostCny.toFixed(4)}` : "—"}
            </dd>
            <dt>耗时</dt>
            <dd style={{ fontFamily: "var(--font-mono)" }}>
              {log.durationMs != null ? `${log.durationMs.toLocaleString()} ms` : "—"}
            </dd>
          </dl>
        </div>

        {/* Prompt Hash */}
        <div className="admin-card">
          <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 20, fontWeight: 400, margin: "0 0 12px" }}>
            Prompt Hash
          </h2>
          <pre
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 14,
              background: "var(--cream-100)",
              padding: "12px 14px",
              borderRadius: 8,
              margin: "0 0 10px",
              wordBreak: "break-all",
            }}
          >
            {log.promptHash}
          </pre>
          <p style={{ fontSize: 12, color: "var(--gray-500)", margin: 0 }}>
            原始 prompt/response 不落盘，仅存 hash 用于去重与审计追溯。
          </p>
        </div>

        {/* 状态 */}
        <div className="admin-card">
          <h2 style={{ fontFamily: "var(--font-serif)", fontSize: 20, fontWeight: 400, margin: "0 0 16px" }}>
            调用状态
          </h2>
          <span className={`chip ${statusChipClass(log.status)}`} style={{ fontSize: 14 }}>
            {log.status}
          </span>
          {log.errorMessage && (
            <div
              style={{
                marginTop: 14,
                background: "var(--danger-50)",
                color: "var(--danger-700)",
                border: "1px solid var(--danger-500)",
                borderRadius: 8,
                padding: "10px 14px",
                fontSize: 14,
                fontFamily: "var(--font-mono)",
                wordBreak: "break-word",
              }}
            >
              {log.errorMessage}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
