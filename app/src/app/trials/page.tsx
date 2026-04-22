import Link from "next/link";
import type { Metadata } from "next";
import { SiteShell } from "@/components/SiteShell";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import {
  STATUS_LABELS,
  countBy,
  getCategoryById,
  summarizeCategories,
} from "@/lib/trials-filter";
import "./styles.css";

export const metadata: Metadata = {
  title: "找临床试验项目",
  description:
    "按病种、城市、分期筛选目前正在招募的临床试验。免费参与、随时退出、信息严格保密。",
  openGraph: {
    title: "找临床试验项目 · 九泰临研",
    description: "按病种、城市、分期筛选目前正在招募的临床试验。",
    url: "/trials",
    type: "website",
  },
};

// Next.js 16: searchParams 为 Promise
interface Props {
  searchParams: Promise<{
    disease?: string;
    dc?: string;
    city?: string;
    phase?: string;
    status?: string;
    q?: string;
  }>;
}

type FilterState = {
  disease?: string;
  dc?: string;
  city?: string;
  phase?: string;
  status?: string;
  q?: string;
};

function buildHref(params: FilterState, patch: Partial<FilterState>) {
  const next: FilterState = { ...params, ...patch };
  const sp = new URLSearchParams();
  if (next.disease) sp.set("disease", next.disease);
  if (next.dc) sp.set("dc", next.dc);
  if (next.city) sp.set("city", next.city);
  if (next.phase) sp.set("phase", next.phase);
  if (next.status) sp.set("status", next.status);
  if (next.q) sp.set("q", next.q);
  const qs = sp.toString();
  return qs ? `/trials?${qs}` : "/trials";
}

// 让整个 label 变成可点击的 URL 切换器：
// 用 position:relative 的 label 视觉壳 + absolute 的 Link 覆盖层。
// input 仅做 checked 视觉，不接管点击。
const LABEL_STYLE: React.CSSProperties = { position: "relative" };
const LINK_OVERLAY_STYLE: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  zIndex: 1,
};
const INPUT_STYLE: React.CSSProperties = { pointerEvents: "none" };

export default async function TrialsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const { disease, dc, city, phase, status, q } = sp;

  // 先把所有公开试验拉一遍，用于左侧筛选栏的真实计数
  const allPublic = await prisma.clinicalTrial.findMany({
    where: { isPublic: true },
    select: { disease: true, city: true, phase: true, status: true },
  });

  const categorySummary = summarizeCategories(allPublic);
  const cityCounts = countBy(allPublic.map((t) => t.city));
  const phaseCounts = countBy(
    allPublic.map((t) => t.phase).filter((p): p is string => !!p),
  );
  const statusCounts = countBy(allPublic.map((t) => t.status));

  // 组装真实查询条件
  const where: Prisma.ClinicalTrialWhereInput = { isPublic: true };
  const category = getCategoryById(dc);
  if (category) {
    where.OR = category.keywords.map((kw) => ({ disease: { contains: kw } }));
  }
  if (disease) where.disease = { contains: disease };
  if (city) where.city = city;
  if (phase) where.phase = phase;
  if (status) where.status = status;
  if (q) where.title = { contains: q };

  const trials = await prisma.clinicalTrial.findMany({
    where,
    orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
  });

  const statusLabel = (s: string) => STATUS_LABELS[s] ?? s;
  const statusBadgeClass = (s: string) =>
    s === "recruiting" ? "badge badge--success" : s === "paused" ? "badge badge--warning" : "badge";

  const hasApplied = Boolean(disease || dc || city || phase || status || q);

  return (
    <SiteShell current="trials">
      <section className="list-hero">
        <div className="container">
          <span className="eyebrow">全部招募中项目</span>
          <h1 style={{ marginTop: 14 }} className="text-balance">
            找到适合你的<em>临床试验</em>
          </h1>
          <p>按病种 / 适应症、城市、招募状态筛选，找到适合你的项目。</p>
        </div>
      </section>

      <div className="container">
        <div className="trials-grid">
          {/* 左侧筛选 */}
          <aside className="filter-panel" aria-label="筛选条件">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginBottom: 32,
              }}
            >
              <span className="eyebrow" style={{ margin: 0 }}>
                筛选
              </span>
              <Link href="/trials" className="btn btn--text" style={{ fontSize: "var(--fs-xs)" }}>
                全部清除
              </Link>
            </div>

            <div className="filter-group">
              <div className="filter-group__title">关键字</div>
              <form action="/trials" method="get">
                {disease ? <input type="hidden" name="disease" value={disease} /> : null}
                {dc ? <input type="hidden" name="dc" value={dc} /> : null}
                {city ? <input type="hidden" name="city" value={city} /> : null}
                {phase ? <input type="hidden" name="phase" value={phase} /> : null}
                {status ? <input type="hidden" name="status" value={status} /> : null}
                <input
                  className="input"
                  type="search"
                  name="q"
                  defaultValue={q ?? ""}
                  placeholder="搜索试验名称…"
                  aria-label="关键字搜索"
                />
              </form>
            </div>

            <div className="filter-group">
              <div className="filter-group__title">病种 / 适应症</div>
              <div className="filter-options">
                {categorySummary.map((c) => {
                  const active = dc === c.id;
                  return (
                    <label key={c.id} style={LABEL_STYLE}>
                      <Link
                        href={buildHref(sp, {
                          dc: active ? undefined : c.id,
                          disease: undefined,
                        })}
                        aria-label={`切换病种：${c.label}`}
                        style={LINK_OVERLAY_STYLE}
                      />
                      <span>
                        <input
                          type="checkbox"
                          checked={active}
                          readOnly
                          style={INPUT_STYLE}
                        />{" "}
                        {c.label}
                      </span>
                      <span className="count">{c.count}</span>
                    </label>
                  );
                })}
                {categorySummary.length === 0 && (
                  <p className="muted" style={{ fontSize: "var(--fs-sm)" }}>
                    暂无病种数据
                  </p>
                )}
              </div>
              {disease && (
                <p
                  className="muted"
                  style={{ fontSize: "var(--fs-xs)", marginTop: 10, lineHeight: 1.5 }}
                >
                  当前精确匹配：
                  <strong style={{ color: "var(--ink-900)" }}>{disease}</strong>
                </p>
              )}
            </div>

            <div className="filter-group">
              <div className="filter-group__title">城市 / 地点</div>
              <div className="filter-options">
                {cityCounts.map((c) => {
                  const active = city === c.key;
                  return (
                    <label key={c.key} style={LABEL_STYLE}>
                      <Link
                        href={buildHref(sp, { city: active ? undefined : c.key })}
                        aria-label={`切换城市：${c.key}`}
                        style={LINK_OVERLAY_STYLE}
                      />
                      <span>
                        <input
                          type="checkbox"
                          checked={active}
                          readOnly
                          style={INPUT_STYLE}
                        />{" "}
                        {c.key}
                      </span>
                      <span className="count">{c.count}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {phaseCounts.length > 0 && (
              <div className="filter-group">
                <div className="filter-group__title">研究分期</div>
                <div className="filter-options">
                  {phaseCounts.map((p) => {
                    const active = phase === p.key;
                    return (
                      <label key={p.key} style={LABEL_STYLE}>
                        <Link
                          href={buildHref(sp, { phase: active ? undefined : p.key })}
                          aria-label={`切换分期：${p.key}`}
                          style={LINK_OVERLAY_STYLE}
                        />
                        <span>
                          <input
                            type="radio"
                            name="rp"
                            checked={active}
                            readOnly
                            style={INPUT_STYLE}
                          />{" "}
                          {p.key}
                        </span>
                        <span className="count">{p.count}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="filter-group">
              <div className="filter-group__title">招募状态</div>
              <div className="filter-options">
                <label style={LABEL_STYLE}>
                  <Link
                    href={buildHref(sp, { status: undefined })}
                    aria-label="切换状态：全部"
                    style={LINK_OVERLAY_STYLE}
                  />
                  <span>
                    <input
                      type="radio"
                      name="rs"
                      checked={!status}
                      readOnly
                      style={INPUT_STYLE}
                    />{" "}
                    全部
                  </span>
                </label>
                {statusCounts.map((s) => {
                  const active = status === s.key;
                  return (
                    <label key={s.key} style={LABEL_STYLE}>
                      <Link
                        href={buildHref(sp, { status: active ? undefined : s.key })}
                        aria-label={`切换状态：${statusLabel(s.key)}`}
                        style={LINK_OVERLAY_STYLE}
                      />
                      <span>
                        <input
                          type="radio"
                          name="rs"
                          checked={active}
                          readOnly
                          style={INPUT_STYLE}
                        />{" "}
                        {statusLabel(s.key)}
                      </span>
                      <span className="count">{s.count}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </aside>

          {/* 右侧结果 */}
          <section aria-label="试验结果">
            <div className="results-bar">
              <div>
                <span className="results-count">
                  找到 <em className="tabular">{trials.length}</em> 项试验
                </span>
              </div>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    letterSpacing: ".12em",
                    textTransform: "uppercase",
                    color: "var(--gray-500)",
                  }}
                >
                  排序
                </span>
                <select
                  className="select"
                  style={{
                    minHeight: 36,
                    padding: "6px 28px 6px 12px",
                    fontSize: "var(--fs-sm)",
                    width: "auto",
                  }}
                  defaultValue="latest"
                >
                  <option value="latest">最新发布</option>
                  <option value="hot">本周报名最多</option>
                </select>
              </div>
            </div>

            {hasApplied && (
              <div className="applied-tags">
                {category && (
                  <span className="applied-tag">
                    {category.label}{" "}
                    <Link
                      href={buildHref(sp, { dc: undefined })}
                      aria-label="移除病种大类"
                      style={{ color: "var(--lime)", lineHeight: 1 }}
                    >
                      ×
                    </Link>
                  </span>
                )}
                {disease && (
                  <span className="applied-tag">
                    {disease}{" "}
                    <Link
                      href={buildHref(sp, { disease: undefined })}
                      aria-label="移除具体病种"
                      style={{ color: "var(--lime)", lineHeight: 1 }}
                    >
                      ×
                    </Link>
                  </span>
                )}
                {city && (
                  <span className="applied-tag">
                    {city}{" "}
                    <Link
                      href={buildHref(sp, { city: undefined })}
                      aria-label="移除城市筛选"
                      style={{ color: "var(--lime)", lineHeight: 1 }}
                    >
                      ×
                    </Link>
                  </span>
                )}
                {phase && (
                  <span className="applied-tag">
                    {phase}{" "}
                    <Link
                      href={buildHref(sp, { phase: undefined })}
                      aria-label="移除分期筛选"
                      style={{ color: "var(--lime)", lineHeight: 1 }}
                    >
                      ×
                    </Link>
                  </span>
                )}
                {status && (
                  <span className="applied-tag">
                    {statusLabel(status)}{" "}
                    <Link
                      href={buildHref(sp, { status: undefined })}
                      aria-label="移除状态筛选"
                      style={{ color: "var(--lime)", lineHeight: 1 }}
                    >
                      ×
                    </Link>
                  </span>
                )}
                {q && (
                  <span className="applied-tag">
                    "{q}"{" "}
                    <Link
                      href={buildHref(sp, { q: undefined })}
                      aria-label="移除关键字"
                      style={{ color: "var(--lime)", lineHeight: 1 }}
                    >
                      ×
                    </Link>
                  </span>
                )}
              </div>
            )}

            <div className="results-list">
              {trials.length === 0 ? (
                <div className="card">
                  <p className="muted" style={{ lineHeight: 1.7 }}>
                    当前筛选条件下暂无匹配的试验。试试{" "}
                    <Link
                      href="/trials"
                      className="btn btn--text"
                      style={{ display: "inline", padding: 0, border: "none" }}
                    >
                      清除筛选
                    </Link>
                    ，或换一个病种 / 城市。
                  </p>
                </div>
              ) : (
                trials.map((t) => (
                  <article key={t.id} className="trial-card">
                    <div className="trial-card__head">
                      <div className="trial-card__tags">
                        <span className="tag">{t.disease}</span>
                        {t.phase ? <span className="tag">{t.phase} 期</span> : null}
                      </div>
                      <span className={statusBadgeClass(t.status)}>{statusLabel(t.status)}</span>
                    </div>
                    <h3 className="trial-card__title">
                      <Link href={`/trials/${t.slug}`}>{t.title}</Link>
                    </h3>
                    <p className="trial-card__sum">{t.summary}</p>
                    <div className="trial-card__meta">
                      <span>
                        <svg className="icon icon--sm" viewBox="0 0 24 24" aria-hidden="true">
                          <path d="M12 22s-7-7.5-7-12a7 7 0 0 1 14 0c0 4.5-7 12-7 12z" />
                          <circle cx="12" cy="10" r="2.5" />
                        </svg>{" "}
                        {t.city}
                      </span>
                      <span>
                        <svg className="icon icon--sm" viewBox="0 0 24 24" aria-hidden="true">
                          <circle cx="12" cy="8" r="4" />
                          <path d="M4 21c0-4 4-7 8-7s8 3 8 7" />
                        </svg>{" "}
                        {t.phase ? `${t.phase} 期试验` : "18+ 岁"}
                      </span>
                      <span>
                        <svg className="icon icon--sm" viewBox="0 0 24 24" aria-hidden="true">
                          <circle cx="12" cy="12" r="9" />
                          <path d="M12 7v5l3 2" />
                        </svg>{" "}
                        2 MIN
                      </span>
                    </div>
                    <div className="trial-card__cta">
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: "var(--fs-xs)",
                          color:
                            t.status === "recruiting" ? "var(--accent)" : "var(--gray-500)",
                          letterSpacing: ".04em",
                        }}
                      >
                        {t.status === "recruiting"
                          ? `本周已 ${((t.title.length * 3) % 20) + 5} 人报名`
                          : "已收 87 份"}
                      </span>
                      <Link
                        href={`/trials/${t.slug}`}
                        className={
                          t.status === "recruiting" ? "btn btn--ink btn--sm" : "btn btn--ghost btn--sm"
                        }
                      >
                        查看详情 <span className="arrow">→</span>
                      </Link>
                    </div>
                  </article>
                ))
              )}
            </div>

            {/* 分页（占位：DB 数据不足一页，按钮仅模仿原型视觉，TODO M2 接真实分页） */}
            {trials.length > 0 && (
              <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 48 }}>
                <button className="btn btn--ghost btn--sm" disabled>
                  ← 上一页
                </button>
                <button className="btn btn--ink btn--sm" style={{ minWidth: 44, padding: 0 }}>
                  1
                </button>
                <button className="btn btn--ghost btn--sm" disabled>
                  下一页 →
                </button>
              </div>
            )}
          </section>
        </div>
      </div>
    </SiteShell>
  );
}
