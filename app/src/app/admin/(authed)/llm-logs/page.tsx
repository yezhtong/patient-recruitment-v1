import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin-session";
import { prisma } from "@/lib/prisma";

function fmtDateTime(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function statusChipClass(status: string) {
  if (status === "success") return "chip--qualified";
  if (status === "error") return "chip--rejected";
  if (status === "timeout") return "chip--contacted";
  return "chip--closed";
}

const SCENARIO_LABELS: Record<string, string> = {
  prescreen_generate: "预筛表生成",
  match_assistant: "匹配助手",
  community_review: "社区审核",
  disease_analysis: "病情分析",
  llm_sanity: "自检",
};

export default async function LlmLogsPage({
  searchParams,
}: {
  searchParams: Promise<{
    scenario?: string;
    status?: string;
    provider?: string;
    dateFrom?: string;
    dateTo?: string;
    q?: string;
  }>;
}) {
  const session = await getAdminSession();
  if (session.role !== "admin") {
    redirect("/admin");
  }

  const sp = await searchParams;
  const scenario = (sp.scenario ?? "").trim();
  const status = (sp.status ?? "").trim();
  const provider = (sp.provider ?? "").trim();
  const dateFrom = (sp.dateFrom ?? "").trim();
  const dateTo = (sp.dateTo ?? "").trim();
  const q = (sp.q ?? "").trim();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const [todayCount, todayCostResult, weekStats, scenarioGroups, logs] = await Promise.all([
    prisma.llmCallLog.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.llmCallLog.aggregate({
      where: { createdAt: { gte: todayStart } },
      _sum: { estimatedCostCny: true },
    }),
    prisma.llmCallLog.groupBy({
      by: ["status"],
      where: { createdAt: { gte: sevenDaysAgo } },
      _count: { status: true },
    }),
    prisma.llmCallLog.groupBy({
      by: ["scenario"],
      _count: { scenario: true },
      orderBy: { _count: { scenario: "desc" } },
    }),
    prisma.llmCallLog.findMany({
      where: {
        AND: [
          scenario ? { scenario } : {},
          status ? { status } : {},
          provider ? { provider } : {},
          dateFrom ? { createdAt: { gte: new Date(dateFrom) } } : {},
          dateTo ? { createdAt: { lte: new Date(dateTo + "T23:59:59") } } : {},
          q ? { promptHash: { contains: q } } : {},
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);

  const weekTotal = weekStats.reduce((acc, r) => acc + r._count.status, 0);
  const weekSuccess = weekStats.find((r) => r.status === "success")?._count.status ?? 0;
  const weekSuccessRate =
    weekTotal > 0 ? Math.round((weekSuccess / weekTotal) * 100) : 0;
  const todayCost = todayCostResult._sum.estimatedCostCny ?? 0;

  return (
    <>
      <div className="admin-topbar">
        <div>
          <h1>
            LLM 日志 <em>/ {String(logs.length).padStart(2, "0")}</em>
          </h1>
          <p className="sub">大模型调用记录 · 成本监控 · 失败追踪</p>
        </div>
      </div>

      <div className="admin-banner admin-banner--info" style={{ marginBottom: 20 }}>
        <div className="admin-banner__body">
          日志中的手机号、身份证号等敏感信息已自动打码，原始数据不落盘。
        </div>
      </div>

      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 24 }}>
        <div className="kpi-card">
          <div className="label">今日调用</div>
          <div className="value">{todayCount}</div>
          <div className="hint">次</div>
        </div>
        <div className="kpi-card">
          <div className="label">今日花费</div>
          <div className="value" style={{ fontSize: 32 }}>
            ¥{todayCost.toFixed(4)}
          </div>
          <div className="hint">人民币</div>
        </div>
        <div className="kpi-card">
          <div className="label">近 7 天成功率</div>
          <div className="value">{weekSuccessRate}%</div>
          <div className="hint">{weekSuccess}/{weekTotal} 成功</div>
        </div>
        <div className="kpi-card">
          <div className="label">场景分布</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 10 }}>
            {scenarioGroups.map((g) => (
              <span key={g.scenario} className="chip chip--type" style={{ fontSize: 11 }}>
                {SCENARIO_LABELS[g.scenario] ?? g.scenario} {g._count.scenario}
              </span>
            ))}
            {scenarioGroups.length === 0 && (
              <span style={{ color: "var(--gray-400)", fontSize: 12 }}>暂无数据</span>
            )}
          </div>
        </div>
      </div>

      <form className="admin-filters" method="get">
        <select name="scenario" defaultValue={scenario}>
          <option value="">全部场景</option>
          <option value="prescreen_generate">预筛表生成</option>
          <option value="match_assistant">匹配助手</option>
          <option value="community_review">社区审核</option>
          <option value="disease_analysis">病情分析</option>
          <option value="llm_sanity">自检</option>
        </select>
        <select name="status" defaultValue={status}>
          <option value="">全部状态</option>
          <option value="success">成功</option>
          <option value="error">失败</option>
          <option value="timeout">超时</option>
        </select>
        <select name="provider" defaultValue={provider}>
          <option value="">全部 Provider</option>
          <option value="deepseek">DeepSeek</option>
          <option value="mock">Mock</option>
        </select>
        <input
          name="dateFrom"
          type="date"
          defaultValue={dateFrom}
          style={{ height: 36, padding: "0 10px", border: "1px solid var(--ink-200)", borderRadius: 8, fontSize: 14 }}
        />
        <input
          name="dateTo"
          type="date"
          defaultValue={dateTo}
          style={{ height: 36, padding: "0 10px", border: "1px solid var(--ink-200)", borderRadius: 8, fontSize: 14 }}
        />
        <input
          name="q"
          type="search"
          placeholder="prompt hash 搜索"
          defaultValue={q}
          style={{ minWidth: 180 }}
        />
        <button type="submit" className="btn-admin">
          查询
        </button>
        {(scenario || status || provider || dateFrom || dateTo || q) && (
          <a href="/admin/llm-logs" className="btn-admin btn-admin--ghost">
            清除筛选
          </a>
        )}
      </form>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>时间</th>
              <th>场景</th>
              <th>Provider / Model</th>
              <th>Prompt 字符</th>
              <th>Response 字符</th>
              <th>Token</th>
              <th>费用 (¥)</th>
              <th>状态</th>
              <th>耗时 (ms)</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td className="muted" style={{ whiteSpace: "nowrap" }}>
                  {fmtDateTime(log.createdAt)}
                </td>
                <td>
                  <span className="chip chip--type">
                    {SCENARIO_LABELS[log.scenario] ?? log.scenario}
                  </span>
                </td>
                <td>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>
                    {log.provider}
                  </div>
                  <div className="muted">{log.model ?? "—"}</div>
                </td>
                <td style={{ fontFamily: "var(--font-mono)", textAlign: "right" }}>
                  {log.promptChars.toLocaleString()}
                </td>
                <td style={{ fontFamily: "var(--font-mono)", textAlign: "right" }}>
                  {log.responseChars?.toLocaleString() ?? "—"}
                </td>
                <td style={{ fontFamily: "var(--font-mono)", textAlign: "right" }}>
                  {log.totalTokens?.toLocaleString() ?? "—"}
                </td>
                <td style={{ fontFamily: "var(--font-mono)", textAlign: "right" }}>
                  {log.estimatedCostCny != null
                    ? log.estimatedCostCny.toFixed(4)
                    : "—"}
                </td>
                <td>
                  <span className={`chip ${statusChipClass(log.status)}`}>
                    {log.status}
                  </span>
                </td>
                <td style={{ fontFamily: "var(--font-mono)", textAlign: "right" }}>
                  {log.durationMs?.toLocaleString() ?? "—"}
                </td>
                <td>
                  <Link
                    href={`/admin/llm-logs/${log.id}`}
                    className="btn-admin btn-admin--sm"
                  >
                    详情
                  </Link>
                </td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td
                  colSpan={10}
                  style={{
                    textAlign: "center",
                    padding: "48px 0",
                    color: "var(--gray-500)",
                  }}
                >
                  暂无 LLM 调用日志
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
