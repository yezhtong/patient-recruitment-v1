import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { toggleFaqPublished } from "@/lib/actions/faq";

const CATEGORY_OPTIONS = [
  { value: "", label: "全部分类" },
  { value: "general", label: "基础问题" },
  { value: "trial-process", label: "试验流程" },
  { value: "safety", label: "安全与风险" },
  { value: "privacy", label: "隐私保护" },
  { value: "costs", label: "费用与医保" },
  { value: "enrollment", label: "报名与入组" },
  { value: "withdraw", label: "退出与权利" },
];
const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  CATEGORY_OPTIONS.filter((o) => o.value).map((o) => [o.value, o.label]),
);

const STATUS_OPTIONS = [
  { value: "", label: "全部状态" },
  { value: "published", label: "已发布" },
  { value: "draft", label: "未发布" },
];

function fmtDateTime(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default async function AdminFaqListPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; status?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const category = (sp.category ?? "").trim();
  const status = (sp.status ?? "").trim();
  const q = (sp.q ?? "").trim();

  const where: {
    category?: string;
    isPublished?: boolean;
    OR?: Array<{ question?: { contains: string }; answer?: { contains: string } }>;
  } = {};
  if (category) where.category = category;
  if (status === "published") where.isPublished = true;
  else if (status === "draft") where.isPublished = false;
  if (q) where.OR = [{ question: { contains: q } }, { answer: { contains: q } }];

  const faqs = await prisma.faqArticle.findMany({
    where,
    orderBy: [{ order: "asc" }, { updatedAt: "desc" }],
  });

  async function togglePublish(formData: FormData) {
    "use server";
    const id = String(formData.get("id") ?? "");
    if (!id) return;
    await toggleFaqPublished(id);
  }

  return (
    <>
      <div className="admin-topbar">
        <div>
          <h1>
            FAQ 管理 <em>/ {String(faqs.length).padStart(2, "0")}</em>
          </h1>
          <p className="sub">患者高频问题库 · 编辑后自动同步到 /faq 与 sitemap</p>
        </div>
        <div className="admin-actions">
          <Link href="/admin/faq/new" className="btn-admin btn-admin--primary">
            + 新建 FAQ
          </Link>
        </div>
      </div>

      <form className="admin-filters" method="get">
        <input name="q" type="search" placeholder="搜索：问题或答案" defaultValue={q} />
        <select name="category" defaultValue={category}>
          {CATEGORY_OPTIONS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <select name="status" defaultValue={status}>
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <button type="submit" className="btn-admin">查询</button>
        {(q || category || status) && (
          <Link href="/admin/faq" className="btn-admin btn-admin--ghost">清空</Link>
        )}
      </form>

      <table className="admin-table">
        <thead>
          <tr>
            <th style={{ width: 64 }}>排序</th>
            <th style={{ width: 120 }}>分类</th>
            <th>问题</th>
            <th style={{ width: 100 }}>状态</th>
            <th style={{ width: 140 }}>更新时间</th>
            <th style={{ width: 180 }}></th>
          </tr>
        </thead>
        <tbody>
          {faqs.map((f) => (
            <tr key={f.id}>
              <td style={{ fontFamily: "var(--font-mono)" }}>{f.order}</td>
              <td>{CATEGORY_LABEL[f.category] ?? f.category}</td>
              <td>
                <strong>{f.question}</strong>
                <div className="muted" style={{ marginTop: 2 }}>
                  {f.answer.slice(0, 60)}
                  {f.answer.length > 60 ? "…" : ""}
                </div>
              </td>
              <td>
                <span className={`chip chip--${f.isPublished ? "published" : "draft"}`}>
                  {f.isPublished ? "已发布" : "草稿"}
                </span>
              </td>
              <td className="muted">{fmtDateTime(f.updatedAt)}</td>
              <td>
                <div style={{ display: "flex", gap: 6 }}>
                  <Link href={`/admin/faq/${f.id}/edit`} className="btn-admin btn-admin--sm">
                    编辑
                  </Link>
                  <form action={togglePublish}>
                    <input type="hidden" name="id" value={f.id} />
                    <button type="submit" className="btn-admin btn-admin--sm btn-admin--ghost">
                      {f.isPublished ? "下架" : "上架"}
                    </button>
                  </form>
                </div>
              </td>
            </tr>
          ))}
          {faqs.length === 0 && (
            <tr>
              <td colSpan={6} style={{ textAlign: "center", padding: "48px 0", color: "var(--gray-500)" }}>
                还没有 FAQ，点击上方「+ 新建 FAQ」开始
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </>
  );
}
