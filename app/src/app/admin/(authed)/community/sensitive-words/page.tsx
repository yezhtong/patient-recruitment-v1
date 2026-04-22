import Link from "next/link";
import { prisma } from "@/lib/prisma";
import SensitiveWordEnableToggle from "./SensitiveWordEnableToggle";

const RISK_TYPE_LABEL: Record<string, string> = {
  contact: "联系方式",
  "drug-sale": "药品推销",
  "enroll-promise": "入组承诺",
  quackery: "伪医疗",
  ad: "广告",
};
const RISK_LEVEL_LABEL: Record<string, string> = {
  high: "高（拦截）",
  medium: "中（转审）",
  low: "低",
};

const TYPE_OPTIONS = [
  { value: "", label: "全部类型" },
  { value: "contact", label: "联系方式" },
  { value: "drug-sale", label: "药品推销" },
  { value: "enroll-promise", label: "入组承诺" },
  { value: "quackery", label: "伪医疗" },
  { value: "ad", label: "广告" },
];
const LEVEL_OPTIONS = [
  { value: "", label: "全部级别" },
  { value: "high", label: "高" },
  { value: "medium", label: "中" },
  { value: "low", label: "低" },
];

function fmtDateTime(d: Date | null | undefined) {
  if (!d) return "—";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default async function AdminSensitiveWordsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; level?: string; q?: string; enabled?: string; imported?: string }>;
}) {
  const sp = await searchParams;
  const type = (sp.type ?? "").trim();
  const level = (sp.level ?? "").trim();
  const q = (sp.q ?? "").trim();
  const enabledOnly = sp.enabled === "1";
  const importedParams = sp.imported;

  const where: {
    riskType?: string;
    riskLevel?: string;
    isEnabled?: boolean;
    keyword?: { contains: string };
  } = {};
  if (type) where.riskType = type;
  if (level) where.riskLevel = level;
  if (enabledOnly) where.isEnabled = true;
  if (q) where.keyword = { contains: q };

  const words = await prisma.sensitiveWord.findMany({
    where,
    orderBy: [{ riskLevel: "asc" }, { updatedAt: "desc" }],
  });

  // 命中统计
  const hitGroups = await prisma.communitySensitiveHit.groupBy({
    by: ["keyword"],
    _count: { _all: true },
    _max: { createdAt: true },
  });
  const hitMap = new Map(
    hitGroups.map((g) => [g.keyword, { count: g._count._all, lastAt: g._max.createdAt }])
  );

  return (
    <>
      <div className="admin-topbar">
        <div>
          <h1>
            敏感词词库 <em>/ {String(words.length).padStart(2, "0")}</em>
          </h1>
          <p className="sub">高风险拦截、中风险转审 · 写操作后 60 秒内扫描生效</p>
        </div>
        <div className="admin-actions">
          <Link href="/admin/community/sensitive-words/import" className="btn-admin">
            批量导入
          </Link>
          <Link href="/admin/community/sensitive-words/new" className="btn-admin btn-admin--primary">
            + 新建词
          </Link>
        </div>
      </div>

      {importedParams && (
        <div
          style={{
            background: "var(--success-50)",
            color: "var(--success-700)",
            padding: "10px 14px",
            borderRadius: 8,
            marginBottom: 18,
            fontSize: 14,
          }}
        >
          批量导入完成：{importedParams}
        </div>
      )}

      <form className="admin-filters" method="get">
        <input name="q" type="search" placeholder="搜索关键词" defaultValue={q} />
        <select name="type" defaultValue={type}>
          {TYPE_OPTIONS.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <select name="level" defaultValue={level}>
          {LEVEL_OPTIONS.map((l) => (
            <option key={l.value} value={l.value}>{l.label}</option>
          ))}
        </select>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14 }}>
          <input type="checkbox" name="enabled" value="1" defaultChecked={enabledOnly} />
          仅看启用
        </label>
        <button type="submit" className="btn-admin">查询</button>
        {(q || type || level || enabledOnly) && (
          <Link href="/admin/community/sensitive-words" className="btn-admin btn-admin--ghost">清空</Link>
        )}
      </form>

      <table className="admin-table">
        <thead>
          <tr>
            <th>关键词</th>
            <th style={{ width: 120 }}>类型</th>
            <th style={{ width: 120 }}>级别</th>
            <th style={{ width: 80 }}>命中数</th>
            <th style={{ width: 140 }}>最近命中</th>
            <th style={{ width: 80 }}>启用</th>
            <th style={{ width: 100 }}></th>
          </tr>
        </thead>
        <tbody>
          {words.map((w) => {
            const stat = hitMap.get(w.keyword);
            return (
              <tr key={w.id}>
                <td style={{ fontFamily: "var(--font-mono)" }}>
                  <strong>{w.keyword}</strong>
                  {w.note ? <div className="muted" style={{ marginTop: 2, fontFamily: "var(--font-sans)" }}>{w.note}</div> : null}
                </td>
                <td>
                  <span className="chip chip--type">{RISK_TYPE_LABEL[w.riskType] ?? w.riskType}</span>
                </td>
                <td>
                  <span className={`chip chip--${w.riskLevel}`}>{RISK_LEVEL_LABEL[w.riskLevel] ?? w.riskLevel}</span>
                </td>
                <td style={{ fontFamily: "var(--font-mono)" }}>{stat?.count ?? 0}</td>
                <td className="muted">{fmtDateTime(stat?.lastAt)}</td>
                <td>
                  <SensitiveWordEnableToggle id={w.id} enabled={w.isEnabled} keyword={w.keyword} />
                </td>
                <td>
                  <Link href={`/admin/community/sensitive-words/${w.id}/edit`} className="btn-admin btn-admin--sm">
                    编辑
                  </Link>
                </td>
              </tr>
            );
          })}
          {words.length === 0 && (
            <tr>
              <td colSpan={7} style={{ textAlign: "center", padding: "48px 0", color: "var(--gray-500)" }}>
                还没有敏感词，点击上方「批量导入」从词库模板快速导入，或点「+ 新建」逐条添加
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </>
  );
}
