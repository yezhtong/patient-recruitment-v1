import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ModerationActions } from "./ModerationActions";

const STATUS_LABEL: Record<string, string> = {
  pending: "待审核",
  approved: "已通过",
  featured: "精选",
  rejected: "已驳回",
  hidden: "已隐藏",
};

const RISK_LABEL: Record<string, string> = {
  contact: "疑似联系方式",
  "drug-sale": "疑似售药 / 代购",
  "enroll-promise": "疑似违规入组承诺",
  quackery: "疑似偏方 / 夸大疗效",
  ad: "疑似引流广告",
};

function fmtDateTime(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function AiResultChip({ result }: { result: string | null }) {
  if (!result) return <span className="chip chip--closed">未审</span>;
  const cls =
    result === "pass"
      ? "chip--qualified"
      : result === "reject"
        ? "chip--rejected"
        : "chip--contacted";
  const label =
    result === "pass" ? "AI 通过" : result === "reject" ? "AI 拒绝" : "待人审";
  return <span className={`chip ${cls}`}>{label}</span>;
}

export default async function AdminCommunityPostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const post = await prisma.communityPost.findUnique({
    where: { id },
    include: {
      group: { select: { slug: true, name: true } },
      authorUser: { select: { phone: true, displayName: true, name: true } },
      sensitiveHits: true,
      moderationLogs: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!post) return notFound();

  const aiConfPct = post.aiReviewConfidence != null
    ? Math.round(post.aiReviewConfidence * 100)
    : null;
  const aiConfColor =
    post.aiReviewConfidence == null
      ? "var(--ink-300)"
      : post.aiReviewConfidence >= 0.8
        ? "var(--success-500)"
        : post.aiReviewConfidence >= 0.5
          ? "var(--warning-500)"
          : "var(--danger-500)";

  return (
    <>
      <div className="admin-topbar">
        <div>
          <h1>
            审核帖子 <em>/ {post.id.slice(-6).toUpperCase()}</em>
          </h1>
          <p className="sub">
            当前状态{" "}
            <span className={`chip chip--${post.reviewStatus}`}>
              {STATUS_LABEL[post.reviewStatus]}
            </span>{" "}
            · 分区 {post.group.name} · {fmtDateTime(post.createdAt)}
          </p>
        </div>
        <div className="admin-actions">
          <Link
            href={`/community/posts/${post.id}`}
            target="_blank"
            className="btn-admin"
          >
            ↗ 预览公开页
          </Link>
          <Link href="/admin/community/posts" className="btn-admin btn-admin--ghost">
            ← 返回列表
          </Link>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0,2fr) minmax(280px,1fr)",
          gap: 18,
        }}
      >
        <div>
          <section className="lead-detail">
            <h2>{post.title}</h2>
            <p className="muted" style={{ marginBottom: 14, fontSize: 13 }}>
              {post.postType === "question" ? "提问" : "经验分享"} ·{" "}
              {post.isAnonymous ? "匿名发布" : "实名发布"} ·{" "}
              {post.authorRole === "operator" ? "官方账号" : "患者"}
            </p>
            <div
              style={{
                whiteSpace: "pre-wrap",
                fontSize: 15,
                lineHeight: 1.8,
                padding: "16px 0",
              }}
            >
              {post.content}
            </div>
          </section>

          <section className="lead-detail">
            <h2>作者信息</h2>
            <dl>
              <dt>手机号</dt>
              <dd style={{ fontFamily: "var(--font-mono)" }}>
                {post.authorUser?.phone ?? "—"}
              </dd>
              <dt>昵称 / 姓名</dt>
              <dd>{post.authorUser?.displayName ?? post.authorUser?.name ?? "—"}</dd>
              <dt>发帖是否匿名</dt>
              <dd>{post.isAnonymous ? "是" : "否"}</dd>
            </dl>
          </section>

          {/* AI 审核信息卡片 */}
          <section className="lead-detail">
            <h2>AI 审核信息</h2>
            <dl>
              <dt>AI 判断</dt>
              <dd>
                <AiResultChip result={post.aiReviewResult} />
              </dd>
              <dt>置信度</dt>
              <dd>
                {aiConfPct !== null ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div
                      style={{
                        flex: 1,
                        maxWidth: 160,
                        height: 8,
                        background: "var(--ink-100)",
                        borderRadius: 999,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${aiConfPct}%`,
                          height: "100%",
                          background: aiConfColor,
                          borderRadius: 999,
                        }}
                      />
                    </div>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 14 }}>
                      {aiConfPct}%
                    </span>
                  </div>
                ) : (
                  <span className="muted">—</span>
                )}
              </dd>
              <dt>AI 理由</dt>
              <dd>
                {post.aiReviewReason ? (
                  <details>
                    <summary style={{ cursor: "pointer", fontSize: 13, color: "var(--ink-600)" }}>
                      {post.aiReviewReason.slice(0, 80)}
                      {post.aiReviewReason.length > 80 ? "… 点击展开" : ""}
                    </summary>
                    {post.aiReviewReason.length > 80 && (
                      <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.7 }}>
                        {post.aiReviewReason}
                      </div>
                    )}
                  </details>
                ) : (
                  <span className="muted">—</span>
                )}
              </dd>
              <dt>AI 审核时间</dt>
              <dd className="muted" style={{ fontSize: 13 }}>
                {post.aiReviewedAt ? fmtDateTime(post.aiReviewedAt) : "—"}
              </dd>
            </dl>

            {post.humanOverride && (
              <div
                style={{
                  marginTop: 14,
                  padding: "12px 14px",
                  background: "var(--warning-50)",
                  border: "1px solid var(--warning-500)",
                  borderRadius: 8,
                }}
              >
                <div
                  style={{
                    fontWeight: 500,
                    fontSize: 13,
                    color: "var(--warning-700)",
                    marginBottom: 4,
                  }}
                >
                  人工决策覆盖
                </div>
                <div style={{ fontSize: 13 }}>{post.humanOverride}</div>
              </div>
            )}
          </section>

          {post.moderationLogs.length > 0 ? (
            <section className="lead-detail">
              <h2>审核日志</h2>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {post.moderationLogs.map((l) => (
                  <li
                    key={l.id}
                    style={{
                      padding: "10px 0",
                      borderBottom: "1px solid var(--ink-100)",
                      fontSize: 13,
                    }}
                  >
                    <strong>{l.action}</strong>{" "}
                    <span className="muted">· {fmtDateTime(l.createdAt)}</span>
                    {l.reason ? <div className="muted">原因：{l.reason}</div> : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <aside>
          <ModerationActions
            postId={post.id}
            currentStatus={post.reviewStatus}
            aiReviewResult={post.aiReviewResult}
          />

          {post.sensitiveHits.length > 0 ? (
            <div className="lead-detail" style={{ marginTop: 18 }}>
              <h2>风险命中 ({post.sensitiveHits.length})</h2>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {post.sensitiveHits.map((h) => (
                  <li
                    key={h.id}
                    style={{
                      padding: "10px 12px",
                      margin: "8px 0",
                      background:
                        h.riskLevel === "high" ? "var(--danger-50)" : "var(--warning-50)",
                      border: `1px solid ${
                        h.riskLevel === "high" ? "var(--danger-500)" : "var(--warning-500)"
                      }`,
                      borderRadius: 8,
                      fontSize: 13,
                    }}
                  >
                    <strong
                      style={{
                        color:
                          h.riskLevel === "high"
                            ? "var(--danger-700)"
                            : "var(--warning-700)",
                      }}
                    >
                      {RISK_LABEL[h.riskType] ?? h.riskType} · {h.riskLevel}
                    </strong>
                    <div style={{ fontFamily: "var(--font-mono)", marginTop: 4 }}>
                      命中：<code>{h.keyword}</code>
                    </div>
                    <div className="muted" style={{ marginTop: 4, fontSize: 12 }}>
                      …{h.snippet}…
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </aside>
      </div>
    </>
  );
}
