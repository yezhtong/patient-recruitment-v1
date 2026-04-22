import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { LEAD_STATUS_LABEL } from "@/lib/constants/lead-status";
import { RecruitStatusControls } from "./RecruitStatusControls";
import type { NewLeadStatus } from "@/lib/actions/leads";

function fmtDateTime(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function prettyAnswers(raw: string | null): string {
  if (!raw) return "（预筛未作答）";
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

export default async function AdminRecruitDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [lead, auditLogs] = await Promise.all([
    prisma.lead.findUnique({
      where: { id },
      include: {
        trial: { select: { slug: true, title: true, disease: true, city: true } },
        application: {
          include: {
            user: { select: { phone: true, name: true, displayName: true } },
          },
        },
      },
    }),
    prisma.auditLog.findMany({
      where: { entityType: "Lead", entityId: id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  if (!lead) return notFound();

  const currentStatus = lead.status as NewLeadStatus;

  return (
    <>
      <div className="admin-topbar">
        <div>
          <h1>
            招募详情 <em>/ {lead.id.slice(-6).toUpperCase()}</em>
          </h1>
          <p className="sub">
            提交时间 {fmtDateTime(lead.createdAt)} · 当前状态{" "}
            <span className={`chip chip--${lead.status}`}>
              {LEAD_STATUS_LABEL[lead.status] ?? lead.status}
            </span>
          </p>
        </div>
        <div className="admin-actions">
          <Link href="/admin/recruits" className="btn-admin btn-admin--ghost">
            ← 返回招募管理
          </Link>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,2fr) minmax(260px,1fr)",
          gap: 18,
        }}
      >
        <div>
          <section className="lead-detail">
            <h2>基础资料</h2>
            <dl>
              <dt>姓名</dt>
              <dd>{lead.name}</dd>
              <dt>手机号</dt>
              <dd style={{ fontFamily: "var(--font-mono)" }}>{lead.phone}</dd>
              <dt>性别</dt>
              <dd>{lead.gender === "female" ? "女" : lead.gender === "male" ? "男" : "—"}</dd>
              <dt>年龄</dt>
              <dd>{lead.age ?? "—"}</dd>
              <dt>所在城市</dt>
              <dd>{lead.city ?? "—"}</dd>
              <dt>病种</dt>
              <dd>{lead.condition ?? "—"}</dd>
            </dl>
          </section>

          <section className="lead-detail">
            <h2>项目与答案</h2>
            <dl>
              <dt>试验</dt>
              <dd>
                <Link
                  href={`/trials/${lead.trial.slug}`}
                  target="_blank"
                  style={{ color: "var(--ink-900)", textDecoration: "underline" }}
                >
                  {lead.trial.title}
                </Link>
              </dd>
              <dt>适应症</dt>
              <dd>
                {lead.trial.disease} · {lead.trial.city}
              </dd>
              <dt>来源</dt>
              <dd>{lead.sourcePage ?? "—"}</dd>
            </dl>
            <h3 style={{ fontSize: 16, fontFamily: "var(--font-sans)", margin: "12px 0 8px" }}>
              预筛答案
            </h3>
            <pre>{prettyAnswers(lead.projectAnswers)}</pre>
          </section>

          <section className="lead-detail">
            <h2>合规授权</h2>
            <dl>
              <dt>隐私政策</dt>
              <dd>{lead.agreePrivacy ? "已同意" : "未同意"}</dd>
              <dt>资料复用</dt>
              <dd>{lead.agreeReuse ? "已同意" : "未同意"}</dd>
            </dl>
          </section>

          {lead.status === "enrolled" && lead.application ? (
            <section className="lead-detail">
              <h2>关联报名</h2>
              <dl>
                <dt>报名 ID</dt>
                <dd style={{ fontFamily: "var(--font-mono)" }}>
                  {lead.application.id.slice(-6).toUpperCase()}
                </dd>
                <dt>患者账号</dt>
                <dd>
                  {lead.application.user.displayName ||
                    lead.application.user.name ||
                    lead.application.user.phone}
                </dd>
                <dt>报名阶段</dt>
                <dd>
                  <span className={`chip chip--${lead.application.stage}`}>
                    {lead.application.stage}
                  </span>
                </dd>
              </dl>
            </section>
          ) : null}

          {auditLogs.length > 0 ? (
            <section className="lead-detail">
              <h2>历史状态流转</h2>
              <table className="admin-table" style={{ marginTop: 0 }}>
                <thead>
                  <tr>
                    <th>时间</th>
                    <th>操作</th>
                    <th>操作人</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="muted">{fmtDateTime(log.createdAt)}</td>
                      <td>{log.summary}</td>
                      <td className="muted">
                        {log.operatorDisplayName ?? log.operatorUsername ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ) : null}
        </div>

        <aside>
          <RecruitStatusControls
            id={lead.id}
            currentStatus={currentStatus}
            currentNote={lead.note}
          />
        </aside>
      </div>
    </>
  );
}
