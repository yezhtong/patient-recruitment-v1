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

function fmtDateTime(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default async function AdminCommunityPostsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; group?: string; risk?: string }>;
}) {
  const sp = await searchParams;
  const status = (sp.status ?? "").trim();
  const groupSlug = (sp.group ?? "").trim();
  const riskOnly = sp.risk === "1";

  const groups = await prisma.communityGroup.findMany({
    select: { id: true, slug: true, name: true },
    orderBy: { sortOrder: "asc" },
  });
  const groupFilter = groupSlug
    ? groups.find((g) => g.slug === groupSlug)
    : null;

  const where: {
    reviewStatus?: string;
    groupId?: string;
    sensitiveHits?: { some: Record<string, never> };
  } = {};
  if (status) where.reviewStatus = status;
  if (groupFilter) where.groupId = groupFilter.id;
  if (riskOnly) where.sensitiveHits = { some: {} };

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
            🔔 风险命中统计
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
        <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 14 }}>
          <input type="checkbox" name="risk" value="1" defaultChecked={riskOnly} />
          仅看有风险命中
        </label>
        <button type="submit" className="btn-admin">
          查询
        </button>
        {(status || groupSlug || riskOnly) && (
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
                {p._count.sensitiveHits > 0 ? (
                  <span
                    style={{
                      color: "var(--warning-700)",
                      fontFamily: "var(--font-mono)",
                      fontSize: 12,
                    }}
                  >
                    🔔 {p._count.sensitiveHits} 项
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
                colSpan={7}
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
