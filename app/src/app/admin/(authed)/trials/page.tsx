import Link from "next/link";
import { prisma } from "@/lib/prisma";

const STATUS_OPTIONS = [
  { value: "", label: "全部状态" },
  { value: "recruiting", label: "招募中" },
  { value: "paused", label: "已暂停" },
  { value: "closed", label: "已结束" },
];

const STATUS_LABEL: Record<string, string> = {
  recruiting: "招募中",
  paused: "已暂停",
  closed: "已结束",
};

function fmtDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function AdminTrialsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const status = (sp.status ?? "").trim();

  const trials = await prisma.clinicalTrial.findMany({
    where: {
      AND: [
        q
          ? {
              OR: [
                { title: { contains: q } },
                { disease: { contains: q } },
                { city: { contains: q } },
                { slug: { contains: q } },
              ],
            }
          : {},
        status ? { status } : {},
      ],
    },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { leads: true } } },
  });

  return (
    <>
      <div className="admin-topbar">
        <div>
          <h1>
            试验管理 <em>/ {String(trials.length).padStart(2, "0")}</em>
          </h1>
          <p className="sub">新建、编辑、上下线试验。列表按最近更新排序。</p>
        </div>
        <div className="admin-actions">
          <Link href="/admin/trials/new" className="btn-admin btn-admin--primary">
            + 新建试验
          </Link>
        </div>
      </div>

      <form className="admin-filters" method="get">
        <input
          name="q"
          type="search"
          placeholder="搜索：标题 / 病种 / 城市 / slug"
          defaultValue={q}
        />
        <select name="status" defaultValue={status}>
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <button type="submit" className="btn-admin">
          查询
        </button>
        {(q || status) && (
          <Link href="/admin/trials" className="btn-admin btn-admin--ghost">
            清空
          </Link>
        )}
      </form>

      <table className="admin-table">
        <thead>
          <tr>
            <th>标题</th>
            <th>病种</th>
            <th>城市</th>
            <th>状态</th>
            <th>公开</th>
            <th>线索数</th>
            <th>更新时间</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {trials.map((t) => (
            <tr key={t.id}>
              <td>
                <div>
                  <Link
                    href={`/admin/trials/${t.id}/edit`}
                    style={{ color: "var(--ink-900)", textDecoration: "none", fontWeight: 500 }}
                  >
                    {t.title}
                  </Link>
                </div>
                <div className="muted">{t.slug}</div>
              </td>
              <td>{t.disease}</td>
              <td>{t.city}</td>
              <td>
                <span className={`chip chip--${t.status}`}>
                  {STATUS_LABEL[t.status] ?? t.status}
                </span>
              </td>
              <td>{t.isPublic ? "✓" : "—"}</td>
              <td>{t._count.leads}</td>
              <td className="muted">{fmtDate(t.updatedAt)}</td>
              <td>
                <Link
                  href={`/admin/trials/${t.id}/edit`}
                  className="btn-admin btn-admin--sm"
                >
                  编辑
                </Link>
              </td>
            </tr>
          ))}
          {trials.length === 0 && (
            <tr>
              <td colSpan={8} style={{ textAlign: "center", padding: "48px 0", color: "var(--gray-500)" }}>
                暂无匹配试验
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </>
  );
}
