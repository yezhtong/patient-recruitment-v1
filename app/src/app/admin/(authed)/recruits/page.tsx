import Link from "next/link";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/admin-session";
import { LEAD_STATUS_LABEL, LEAD_STATUS_OPTIONS } from "@/lib/constants/lead-status";
import { LeadsExportCsvButton } from "../leads/_components/ExportCsvButton";

function maskPhone(phone: string) {
  if (phone.length !== 11) return phone;
  return `${phone.slice(0, 3)}****${phone.slice(7)}`;
}

function fmtDateTime(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default async function AdminRecruitsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; trial?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const status = (sp.status ?? "").trim();
  const trialSlug = (sp.trial ?? "").trim();
  const q = (sp.q ?? "").trim();

  const session = await getAdminSession();
  const canExport = session?.role === "admin";

  const trials = await prisma.clinicalTrial.findMany({
    select: { id: true, slug: true, title: true },
    orderBy: { updatedAt: "desc" },
  });

  const trialFilter = trialSlug
    ? trials.find((t) => t.slug === trialSlug)
    : null;

  const where: {
    status?: string;
    trialId?: string;
    OR?: Array<{ name?: { contains: string }; phone?: { contains: string } }>;
  } = {};
  if (status) where.status = status;
  if (trialFilter) where.trialId = trialFilter.id;
  if (q) where.OR = [{ name: { contains: q } }, { phone: { contains: q } }];

  const leads = await prisma.lead.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      trial: { select: { slug: true, title: true, disease: true, city: true } },
    },
    take: 200,
  });

  return (
    <>
      <div className="admin-topbar">
        <div>
          <h1>
            招募管理 <em>/ {String(leads.length).padStart(2, "0")}</em>
          </h1>
          <p className="sub">患者预筛提交集中处理 · 点击查看详情并流转状态</p>
        </div>
        {canExport && (
          <div className="admin-actions">
            <Suspense fallback={null}>
              <LeadsExportCsvButton />
            </Suspense>
          </div>
        )}
      </div>

      <form className="admin-filters" method="get">
        <input
          name="q"
          type="search"
          placeholder="搜索：姓名 / 手机号"
          defaultValue={q}
        />
        <select name="status" defaultValue={status}>
          {LEAD_STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <select name="trial" defaultValue={trialSlug}>
          <option value="">全部试验</option>
          {trials.map((t) => (
            <option key={t.slug} value={t.slug}>
              {t.title}
            </option>
          ))}
        </select>
        <button type="submit" className="btn-admin">
          查询
        </button>
        {(q || status || trialSlug) && (
          <Link href="/admin/recruits" className="btn-admin btn-admin--ghost">
            清空
          </Link>
        )}
      </form>

      <table className="admin-table">
        <thead>
          <tr>
            <th>提交时间</th>
            <th>患者</th>
            <th>手机号</th>
            <th>试验</th>
            <th>病种</th>
            <th>城市</th>
            <th>状态</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {leads.map((l) => (
            <tr key={l.id}>
              <td className="muted">{fmtDateTime(l.createdAt)}</td>
              <td>
                <strong>{l.name}</strong>
                {l.age ? <span className="muted"> · {l.age} 岁</span> : null}
              </td>
              <td style={{ fontFamily: "var(--font-mono)" }}>{maskPhone(l.phone)}</td>
              <td>
                <Link
                  href={`/trials/${l.trial.slug}`}
                  target="_blank"
                  style={{ color: "var(--ink-900)", textDecoration: "none" }}
                >
                  {l.trial.title}
                </Link>
              </td>
              <td>{l.trial.disease}</td>
              <td>{l.city ?? l.trial.city}</td>
              <td>
                <span className={`chip chip--${l.status}`}>
                  {LEAD_STATUS_LABEL[l.status] ?? l.status}
                </span>
              </td>
              <td>
                <Link href={`/admin/recruits/${l.id}`} className="btn-admin btn-admin--sm">
                  查看
                </Link>
              </td>
            </tr>
          ))}
          {leads.length === 0 && (
            <tr>
              <td colSpan={8} style={{ textAlign: "center", padding: "48px 0", color: "var(--gray-500)" }}>
                暂无招募记录
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </>
  );
}
