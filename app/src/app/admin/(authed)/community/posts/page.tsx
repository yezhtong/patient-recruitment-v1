import Link from "next/link";
import { prisma } from "@/lib/prisma";

const STATUS_OPTIONS = [
  { value: "", label: "全部状态" },
  { value: "pending", label: "待审核" },
  { value: "approved", label: "已通过" },
  { value: "featured", label: "精选" },
  { value: "rejected", label: "已驳回" },
  { value: "hidden", label: "已隐藏" },
];

const STATUS_LABEL: Record<string, string> = {
  pending: "待审核",
  approved: "已通过",
  featured: "精选",
  rejected: "已驳回",
  hidden: "已隐藏",
};

const AI_RESULT_LABEL: Record<string, string> = {
  pass: "pass",
  reject: "reject",
  review_needed: "待人审",
};

const AI_CONFIDENCE_OPTIONS = [
  { value: "", label: "全部置信度" },
  { value: "low", label: "低置信度 (<50%)" },
  { value: "high", label: "高置信度 (≥80%)" },
];

function fmtDateTime(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function AiResultChip({ result }: { result: string | null }) {
  if (!result) {
    return <span className="chip chip--closed">未审</span>;
  }
  const cls =
    result === "pass"
      ? "chip--qualified"
      : result === "reject"
        ? "chip--rejected"
        : "chip--contacted";
  return (
    <span className={`chip ${cls}`}>{AI_RESULT_LABEL[result] ?? result}</span>
  );
}

function ConfidenceBar({ value }: { value: number | null }) {
  if (value === null) return <span className="muted">—</span>;
  const pct = Math.round(value * 100);
  const color =
    value >= 0.8
      ? "var(--success-500)"
      : value >= 0.5
        ? "var(--warning-500)"
        : "var(--danger-500)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 80 }}>
      <div
        style={{
          flex: 1,
          height: 6,
          background: "var(--ink-100)",
          borderRadius: 999,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: color,
            borderRadius: 999,
          }}
        />
      </div>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-600)", flexShrink: 0 }}>
        {pct}%
      </span>
    </div>
  );
}

export default async function AdminCommunityPostsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    group?: string;
    risk?: string;
    aiResult?: string;
    confidence?: string;
    overridden?: string;
  }>;
}) {
  const sp = await searchParams;
  const status = (sp.status ?? "").trim();
  const groupSlug = (sp.group ?? "").trim();
  const riskOnly = sp.risk === "1";
  const aiResultFilter = (sp.aiResult ?? "").trim();
  const confidenceFilter = (sp.confidence ?? "").trim();
  const overriddenOnly = sp.overridden === "1";

  const groups = await prisma.communityGroup.findMany({
    select: { id: true, slug: true, name: true },
    orderBy: { sortOrder: "asc" },
  });
  const groupFilter = groupSlug
    ? groups.find((g) => g.slug === groupSlug)
    : null;

  const where: Record<string, unknown> = {};
  if (status) where.reviewStatus = status;
  if (groupFilter) where.groupId = groupFilter.id;
  if (riskOnly) where.sensitiveHits = { some: {} };
  if (aiResultFilter) where.aiReviewResult = aiResultFilter;
  if (overriddenOnly) where.humanOverride = { not: null };
  if (confidenceFilter === "low") {
    where.aiReviewConfidence = { lt: 0.5 };
  } else if (confidenceFilter === "high") {
    where.aiReviewConfidence = { gte: 0.8 };
  }

  const posts = await prisma.communityPost.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      group: { select: { slug: true, name: true } },
      authorUser: { select: { phone: true } },
      _count: { select: { sensitiveHits: true, comments: true } },
    },
    take: 200,
  });

  const hasFilter = !!(status || groupSlug || riskOnly || aiResultFilter || confidenceFilter || overriddenOnly);

  return (
    <>
      <div className="admin-topbar">
        <div>
          <h1>
            社区审核 <em>/ {String(posts.length).padStart(2, "0")}</em>
          </h1>
          <p className="sub">帖子审核与精选管理，敏感词命中会自动标记</p>
        </div>
        <div className="admin-actions">
          <Link href="/admin/community/sensitive-hits" className="btn-admin">
            风险命中统计
          </Link>
        </div>
      </div>

      <form className="admin-filters" method="get">
        <select name="status" defaultValue={status}>
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <select name="group" defaultValue={groupSlug}>
          <option value="">全部分区</option>
          {groups.map((g) => (
            <option key={g.slug} value={g.slug}>
              {g.name}
            </option>
          ))}
        </select>
        <select name="aiResult" defaultValue={aiResultFilter}>
          <option value="">全部 AI 结论</option>
          <option value="pass">AI 通过</option>
          <option value="reject">AI 拒绝</option>
          <option value="review_needed">待人审</option>
        </select>
        <select name="confidence" defaultValue={confidenceFilter}>
          {AI_CONFIDENCE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 14 }}>
          <input type="checkbox" name="risk" value="1" defaultChecked={riskOnly} />
          仅看有风险命中
        </label>
        <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 14 }}>
          <input type="checkbox" name="overridden" value="1" defaultChecked={overriddenOnly} />
          仅看人工覆盖
        </label>
        <button type="submit" className="btn-admin">
          查询
        </button>
        {hasFilter && (
          <Link href="/admin/community/posts" className="btn-admin btn-admin--ghost">
            清空
          </Link>
        )}
      </form>

      <table className="admin-table">
        <thead>
          <tr>
            <th>时间</th>
            <th>标题 / 摘要</th>
            <th>分区</th>
            <th>作者</th>
            <th>状态</th>
            <th>AI 判断</th>
            <th>AI 置信度</th>
            <th>AI 理由</th>
            <th>风险</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {posts.map((p) => (
            <tr key={p.id}>
              <td className="muted">{fmtDateTime(p.createdAt)}</td>
              <td>
                <div style={{ fontWeight: 500 }}>
                  {p.isFeatured ? "★ " : ""}
                  {p.title.length > 40 ? `${p.title.slice(0, 40)}…` : p.title}
                </div>
                <div className="muted" style={{ marginTop: 4 }}>
                  {p.content.replace(/\s+/g, " ").slice(0, 60)}…
                </div>
              </td>
              <td>{p.group.name}</td>
              <td>
                {p.authorRole === "operator" ? (
                  <span className="chip chip--enrolled">官方</span>
                ) : p.isAnonymous ? (
                  <span className="muted">匿名</span>
                ) : (
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>
                    {p.authorUser?.phone
                      ? `${p.authorUser.phone.slice(0, 3)}****${p.authorUser.phone.slice(7)}`
                      : "—"}
                  </span>
                )}
              </td>
              <td>
                <span className={`chip chip--${p.reviewStatus}`}>
                  {STATUS_LABEL[p.reviewStatus] ?? p.reviewStatus}
                </span>
              </td>
              <td>
                <AiResultChip result={p.aiReviewResult} />
                {p.humanOverride && (
                  <div style={{ fontSize: 11, color: "var(--warning-700)", marginTop: 3 }}>
                    已人工覆盖
                  </div>
                )}
              </td>
              <td>
                <ConfidenceBar value={p.aiReviewConfidence} />
              </td>
              <td style={{ maxWidth: 160 }}>
                {p.aiReviewReason ? (
                  <span
                    title={p.aiReviewReason}
                    style={{
                      fontSize: 12,
                      color: "var(--ink-600)",
                      display: "block",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      maxWidth: 160,
                    }}
                  >
                    {p.aiReviewReason}
                  </span>
                ) : (
                  <span className="muted">—</span>
                )}
              </td>
              <td>
                {p._count.sensitiveHits > 0 ? (
                  <span
                    style={{
                      color: "var(--warning-700)",
                      fontFamily: "var(--font-mono)",
                      fontSize: 12,
                    }}
                  >
                    {p._count.sensitiveHits} 项
                  </span>
                ) : (
                  <span className="muted">—</span>
                )}
              </td>
              <td>
                <Link
                  href={`/admin/community/posts/${p.id}`}
                  className="btn-admin btn-admin--sm"
                >
                  审核
                </Link>
              </td>
            </tr>
          ))}
          {posts.length === 0 && (
            <tr>
              <td
                colSpan={10}
                style={{ textAlign: "center", padding: "48px 0", color: "var(--gray-500)" }}
              >
                暂无帖子
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </>
  );
}
