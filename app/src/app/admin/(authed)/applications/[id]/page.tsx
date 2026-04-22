import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ApplicationStageControls } from "./ApplicationStageControls";

const STAGE_LABEL: Record<string, string> = {
  submitted: "已提交",
  in_review: "预筛审核",
  contacted: "已联系",
  enrolled: "已入组",
  withdrawn: "已退出",
  closed: "已关闭",
};

function fmtDateTime(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default async function AdminApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const app = await prisma.application.findUnique({
    where: { id },
    include: {
      user: true,
      trial: { select: { slug: true, title: true, disease: true, city: true } },
      lead: true,
    },
  });
  if (!app) return notFound();

  return (
    <>
      <div className="admin-topbar">
        <div>
          <h1>
            报名详情 <em>/ {app.id.slice(-6).toUpperCase()}</em>
          </h1>
          <p className="sub">
            提交 {fmtDateTime(app.createdAt)} · 当前阶段{" "}
            <span className={`chip chip--${app.stage}`}>{STAGE_LABEL[app.stage]}</span>
          </p>
        </div>
        <div className="admin-actions">
          <Link href="/admin/applications" className="btn-admin btn-admin--ghost">
            ← 返回列表
          </Link>
          {app.leadId ? (
            <Link href={`/admin/leads/${app.leadId}`} className="btn-admin">
              查看原始线索
            </Link>
          ) : null}
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
            <h2>患者账户</h2>
            <dl>
              <dt>手机号</dt>
              <dd style={{ fontFamily: "var(--font-mono)" }}>{app.user.phone}</dd>
              <dt>姓名</dt>
              <dd>{app.user.name ?? "—"}</dd>
              <dt>昵称</dt>
              <dd>{app.user.displayName ?? "—"}</dd>
              <dt>性别 / 年龄</dt>
              <dd>
                {app.user.gender === "female" ? "女" : app.user.gender === "male" ? "男" : "—"}
                {app.user.age ? ` · ${app.user.age} 岁` : ""}
              </dd>
              <dt>城市</dt>
              <dd>{app.user.city ?? "—"}</dd>
              <dt>主要病种</dt>
              <dd>{app.user.condition ?? "—"}</dd>
            </dl>
          </section>

          <section className="lead-detail">
            <h2>试验与预筛</h2>
            <dl>
              <dt>试验</dt>
              <dd>
                <Link
                  href={`/trials/${app.trial.slug}`}
                  target="_blank"
                  style={{ color: "var(--ink-900)", textDecoration: "underline" }}
                >
                  {app.trial.title}
                </Link>
              </dd>
              <dt>适应症</dt>
              <dd>
                {app.trial.disease} · {app.trial.city}
              </dd>
              <dt>提交备注</dt>
              <dd>{app.note ?? "—"}</dd>
            </dl>
            {app.lead?.projectAnswers ? (
              <>
                <h3 style={{ fontSize: 16, fontFamily: "var(--font-sans)", margin: "12px 0 8px" }}>
                  预筛答案
                </h3>
                <pre>
                  {(() => {
                    try {
                      return JSON.stringify(JSON.parse(app.lead.projectAnswers), null, 2);
                    } catch {
                      return app.lead.projectAnswers;
                    }
                  })()}
                </pre>
              </>
            ) : null}
          </section>
        </div>

        <aside>
          <ApplicationStageControls
            id={app.id}
            currentStage={app.stage as "submitted" | "in_review" | "contacted" | "enrolled" | "withdrawn" | "closed"}
            currentNextAction={app.nextAction}
            currentNote={app.note}
          />
        </aside>
      </div>
    </>
  );
}
