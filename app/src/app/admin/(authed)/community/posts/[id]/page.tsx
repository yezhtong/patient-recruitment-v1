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
          />

          {post.sensitiveHits.length > 0 ? (
            <div className="lead-detail" style={{ marginTop: 18 }}>
              <h2>🔔 风险命中 ({post.sensitiveHits.length})</h2>
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
