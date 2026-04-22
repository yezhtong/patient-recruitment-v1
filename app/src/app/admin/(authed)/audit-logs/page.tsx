import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin-session";
import { prisma } from "@/lib/prisma";

function fmtDateTime(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

function prettyDetail(raw: string | null) {
  if (!raw) return "—";
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

export default async function AdminAuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; entity?: string; action?: string }>;
}) {
  const session = await getAdminSession();
  if (session.role !== "admin") {
    redirect("/admin");
  }

  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const entity = (sp.entity ?? "").trim();
  const action = (sp.action ?? "").trim();

  const logs = await prisma.auditLog.findMany({
    where: {
      AND: [
        entity ? { entityType: entity } : {},
        action ? { action } : {},
        q
          ? {
              OR: [
                { summary: { contains: q } },
                { entityId: { contains: q } },
                { operatorUsername: { contains: q } },
                { operatorDisplayName: { contains: q } },
              ],
            }
          : {},
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const [entityOptions, actionOptions] = await Promise.all([
    prisma.auditLog.findMany({
      distinct: ["entityType"],
      select: { entityType: true },
      orderBy: { entityType: "asc" },
    }),
    prisma.auditLog.findMany({
      distinct: ["action"],
      select: { action: true },
      orderBy: { action: "asc" },
    }),
  ]);

  return (
    <>
      <div className="admin-topbar">
        <div>
          <h1>
            审计日志 <em>/ {String(logs.length).padStart(2, "0")}</em>
          </h1>
          <p className="sub">后台关键写操作的统一追溯记录</p>
        </div>
      </div>

      <form className="admin-filters" method="get">
        <input
          name="q"
          type="search"
          placeholder="搜索：摘要 / 操作人 / 实体 ID"
          defaultValue={q}
        />
        <select name="entity" defaultValue={entity}>
          <option value="">全部实体</option>
          {entityOptions.map((item) => (
            <option key={item.entityType} value={item.entityType}>
              {item.entityType}
            </option>
          ))}
        </select>
        <select name="action" defaultValue={action}>
          <option value="">全部动作</option>
          {actionOptions.map((item) => (
            <option key={item.action} value={item.action}>
              {item.action}
            </option>
          ))}
        </select>
        <button type="submit" className="btn-admin">
          查询
        </button>
      </form>

      <table className="admin-table">
        <thead>
          <tr>
            <th>时间</th>
            <th>动作</th>
            <th>实体</th>
            <th>摘要</th>
            <th>操作人</th>
            <th>详情</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id}>
              <td className="muted">{fmtDateTime(log.createdAt)}</td>
              <td>
                <code>{log.action}</code>
              </td>
              <td>
                <div>{log.entityType}</div>
                <div className="muted" style={{ fontFamily: "var(--font-mono)" }}>
                  {log.entityId ?? "—"}
                </div>
              </td>
              <td>{log.summary}</td>
              <td>
                <div>{log.operatorDisplayName ?? "—"}</div>
                <div className="muted">
                  @{log.operatorUsername ?? "unknown"} · {log.operatorRole ?? "—"}
                </div>
              </td>
              <td style={{ maxWidth: 360 }}>
                <pre style={{ margin: 0 }}>{prettyDetail(log.detailJson)}</pre>
              </td>
            </tr>
          ))}
          {logs.length === 0 ? (
            <tr>
              <td
                colSpan={6}
                style={{ textAlign: "center", padding: "48px 0", color: "var(--gray-500)" }}
              >
                暂无审计记录
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </>
  );
}
