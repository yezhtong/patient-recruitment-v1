import Link from "next/link";
import {
  getKpiCards,
  getApplicationStageDist,
  getTopTrials,
  getTodoCounts,
  type KpiRange,
  type ApplicationStageItem,
} from "@/lib/queries/admin-dashboard";

function isRange(x: string | undefined): x is KpiRange {
  return x === "7d" || x === "30d";
}

function StatusChip({ status }: { status: string }) {
  return <span className={`chip chip--${status}`}>{status}</span>;
}

function DeltaBadge({ delta, prev }: { delta?: number; prev?: number }) {
  if (delta === undefined) return null;
  if (prev === 0 && delta > 0) {
    return (
      <span className="kpi-delta kpi-delta--up" aria-label="从零起步">
        新增
      </span>
    );
  }
  if (delta === 0) {
    return (
      <span className="kpi-delta kpi-delta--flat" aria-label="持平">
        0%
      </span>
    );
  }
  const up = delta > 0;
  return (
    <span
      className={`kpi-delta ${up ? "kpi-delta--up" : "kpi-delta--down"}`}
      aria-label={up ? `上升 ${delta}%` : `下降 ${Math.abs(delta)}%`}
    >
      {up ? "▲" : "▼"} {Math.abs(delta)}%
    </span>
  );
}


function StageStackBar({ items }: { items: ApplicationStageItem[] }) {
  const total = items.reduce((s, i) => s + i.count, 0);
  const colors: Record<string, string> = {
    submitted: "var(--info-50)",
    in_review: "var(--warning-50)",
    contacted: "var(--warning-50)",
    enrolled: "var(--success-50)",
    withdrawn: "var(--gray-50)",
    closed: "var(--gray-50)",
  };
  const borders: Record<string, string> = {
    submitted: "var(--info-700)",
    in_review: "var(--warning-700)",
    contacted: "var(--warning-700)",
    enrolled: "var(--success-700)",
    withdrawn: "var(--gray-400)",
    closed: "var(--gray-500)",
  };
  return (
    <div
      className="stage-stack"
      role="img"
      aria-label={`报名阶段分布，合计 ${total} 条`}
    >
      {total === 0 ? (
        <div className="stage-stack__empty">暂无报名数据</div>
      ) : (
        <>
          <div className="stage-stack__bar">
            {items.map((i) => {
              if (i.count === 0) return null;
              const pct = (i.count / total) * 100;
              return (
                <div
                  key={i.stage}
                  className="stage-stack__seg"
                  style={{
                    width: `${pct}%`,
                    background: colors[i.stage],
                    borderColor: borders[i.stage],
                  }}
                  title={`${i.label} ${i.count} 条`}
                >
                  {pct >= 8 ? <span>{i.count}</span> : null}
                </div>
              );
            })}
          </div>
          <ul className="stage-stack__legend">
            {items.map((i) => (
              <li key={i.stage}>
                <span className="dot" style={{ background: colors[i.stage], borderColor: borders[i.stage] }} />
                {i.label} <strong>{i.count}</strong>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const sp = await searchParams;
  const range: KpiRange = isRange(sp.range) ? sp.range : "7d";

  const [kpi, stageDist, topTrials, todo] = await Promise.all([
    getKpiCards(range),
    getApplicationStageDist(),
    getTopTrials(30, 5),
    getTodoCounts(),
  ]);

  return (
    <>
      <div className="admin-topbar">
        <div>
          <h1>
            工作台 <em>/ 01</em>
          </h1>
          <p className="sub">运营指标 · 实时快照</p>
        </div>
        <div className="admin-actions">
          <div className="range-switch" role="group" aria-label="时间范围">
            <Link
              href="?range=7d"
              className={`btn-admin btn-admin--sm${range === "7d" ? "" : " btn-admin--ghost"}`}
              aria-current={range === "7d" ? "page" : undefined}
            >
              近 7 天
            </Link>
            <Link
              href="?range=30d"
              className={`btn-admin btn-admin--sm${range === "30d" ? "" : " btn-admin--ghost"}`}
              aria-current={range === "30d" ? "page" : undefined}
            >
              近 30 天
            </Link>
          </div>
          <Link href="/admin/trials/new" className="btn-admin btn-admin--primary">
            + 新建试验
          </Link>
        </div>
      </div>

      <div className="kpi-grid">
        {kpi.map((c) => (
          <div
            key={c.key}
            className="kpi-card"
            role="group"
            aria-labelledby={`kpi-${c.key}-label`}
          >
            <div id={`kpi-${c.key}-label`} className="label">
              {c.label}
            </div>
            <div className="kpi-card__value-row">
              <div className="value">{c.value}</div>
              <DeltaBadge delta={c.delta} prev={c.prev} />
            </div>
            <div className="hint">{c.hint}</div>
          </div>
        ))}
      </div>

      <div className="admin-card" style={{ marginTop: 24 }}>
        <h2 className="dashboard-card__title">报名阶段分布</h2>
        <StageStackBar items={stageDist} />
      </div>

      <div className="admin-card" style={{ marginTop: 24 }}>
        <h2 className="dashboard-card__title">
          Top 5 热门试验{" "}
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--gray-500)" }}>/ 近 30 日</span>
        </h2>
        {topTrials.length === 0 ? (
          <div style={{ padding: "32px 0", textAlign: "center", color: "var(--gray-500)" }}>
            <p style={{ marginBottom: 12 }}>还没有试验数据</p>
            <Link href="/admin/trials/new" className="btn-admin btn-admin--primary btn-admin--sm">
              + 新建试验
            </Link>
          </div>
        ) : (
          <table className="admin-table" style={{ marginTop: 12 }}>
            <thead>
              <tr>
                <th style={{ width: 56 }}>#</th>
                <th>试验</th>
                <th>病种</th>
                <th>城市</th>
                <th>近 30 日</th>
                <th>累计</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              {topTrials.map((t, i) => (
                <tr key={t.id}>
                  <td style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--ink-900)" }}>
                    #{String(i + 1).padStart(2, "0")}
                  </td>
                  <td>
                    <Link
                      href={`/admin/trials/${t.id}/edit`}
                      style={{ color: "var(--ink-900)", textDecoration: "none" }}
                    >
                      <strong>{t.title}</strong>
                    </Link>
                  </td>
                  <td>{t.disease}</td>
                  <td>{t.city}</td>
                  <td style={{ fontFamily: "var(--font-mono)" }}>{t.recentLeadCount}</td>
                  <td style={{ fontFamily: "var(--font-mono)", color: "var(--gray-500)" }}>
                    {t.totalLeadCount}
                  </td>
                  <td>
                    <StatusChip status={t.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="admin-card" style={{ marginTop: 24 }}>
        <h2 className="dashboard-card__title">待办清单</h2>
        {todo.pendingLeads === 0 && todo.pendingCommunityPosts === 0 && todo.pendingApplications === 0 ? (
          <div
            className="admin-banner admin-banner--success"
            role="status"
            style={{ marginBottom: 0 }}
          >
            <div className="admin-banner__body">✓ 暂无待办，全部清零</div>
          </div>
        ) : (
          <ul className="todo-list">
            {todo.pendingLeads > 0 ? (
              <li>
                <Link href="/admin/recruits?status=submitted" className="todo-list__item">
                  <div className="todo-list__left">
                    <div className="todo-list__n">{todo.pendingLeads}</div>
                    <div className="todo-list__label">待跟进线索</div>
                  </div>
                  <span className="todo-list__arrow">→</span>
                </Link>
              </li>
            ) : null}
            {todo.pendingCommunityPosts > 0 ? (
              <li>
                <Link href="/admin/community/posts?status=pending" className="todo-list__item">
                  <div className="todo-list__left">
                    <div className="todo-list__n">{todo.pendingCommunityPosts}</div>
                    <div className="todo-list__label">社区待审核</div>
                  </div>
                  <span className="todo-list__arrow">→</span>
                </Link>
              </li>
            ) : null}
            {todo.pendingApplications > 0 ? (
              <li>
                <Link href="/admin/recruits?status=submitted" className="todo-list__item">
                  <div className="todo-list__left">
                    <div className="todo-list__n">{todo.pendingApplications}</div>
                    <div className="todo-list__label">报名待审核</div>
                  </div>
                  <span className="todo-list__arrow">→</span>
                </Link>
              </li>
            ) : null}
          </ul>
        )}
      </div>
    </>
  );
}
