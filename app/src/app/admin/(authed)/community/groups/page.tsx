import Link from "next/link";
import { prisma } from "@/lib/prisma";
import GroupEnableToggle from "./GroupEnableToggle";

function fmtDateTime(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default async function AdminCommunityGroupsPage() {
  const groups = await prisma.communityGroup.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: { _count: { select: { posts: true } } },
  });

  // 本周新增帖子数
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const weeklyCounts = await Promise.all(
    groups.map((g) =>
      prisma.communityPost.count({
        where: { groupId: g.id, createdAt: { gte: oneWeekAgo } },
      })
    )
  );

  return (
    <>
      <div className="admin-topbar">
        <div>
          <h1>
            社区分区 <em>/ {String(groups.length).padStart(2, "0")}</em>
          </h1>
          <p className="sub">病种分区配置 · 编辑后自动同步到 /community 前台</p>
        </div>
        <div className="admin-actions">
          <Link href="/admin/community/groups/new" className="btn-admin btn-admin--primary">
            + 新建分区
          </Link>
        </div>
      </div>

      <table className="admin-table">
        <thead>
          <tr>
            <th style={{ width: 64 }}>排序</th>
            <th>名称</th>
            <th>slug</th>
            <th>病种标签</th>
            <th>简介</th>
            <th style={{ width: 80 }}>帖子</th>
            <th style={{ width: 80 }}>本周新</th>
            <th style={{ width: 140 }}>更新时间</th>
            <th style={{ width: 80 }}>启用</th>
            <th style={{ width: 100 }}></th>
          </tr>
        </thead>
        <tbody>
          {groups.map((g, i) => (
            <tr key={g.id}>
              <td style={{ fontFamily: "var(--font-mono)" }}>{g.sortOrder}</td>
              <td>
                <strong style={{ fontFamily: "var(--font-serif)", fontSize: 17 }}>{g.name}</strong>
              </td>
              <td className="muted" style={{ fontFamily: "var(--font-mono)" }}>{g.slug}</td>
              <td>{g.diseaseTag ?? "—"}</td>
              <td className="muted">
                {g.introduction ? (g.introduction.length > 40 ? g.introduction.slice(0, 40) + "…" : g.introduction) : "—"}
              </td>
              <td style={{ fontFamily: "var(--font-mono)" }}>{g._count.posts}</td>
              <td style={{ fontFamily: "var(--font-mono)" }}>{weeklyCounts[i]}</td>
              <td className="muted">{fmtDateTime(g.updatedAt)}</td>
              <td>
                <GroupEnableToggle id={g.id} enabled={g.isEnabled} name={g.name} />
              </td>
              <td>
                <Link href={`/admin/community/groups/${g.id}/edit`} className="btn-admin btn-admin--sm">
                  编辑
                </Link>
              </td>
            </tr>
          ))}
          {groups.length === 0 && (
            <tr>
              <td colSpan={10} style={{ textAlign: "center", padding: "48px 0", color: "var(--gray-500)" }}>
                还没有分区，点击上方「+ 新建分区」开始
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </>
  );
}
