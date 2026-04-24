import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { MediaUploadForm } from "./MediaUploadForm";
import { MediaCardActions } from "./MediaCardActions";

export const metadata: Metadata = {
  title: "图片素材库 · 九泰临研后台",
};

const CATEGORIES: { key: string; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "hero", label: "首页 Hero" },
  { key: "community", label: "社区头图" },
  { key: "trial", label: "试验配图" },
  { key: "faq", label: "FAQ 配图" },
  { key: "avatar", label: "头像占位" },
  { key: "step", label: "首页步骤" },
];

function formatBytes(b: number | null): string {
  if (!b) return "—";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
}

export default async function AdminMediaPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category: catParam } = await searchParams;
  const category = CATEGORIES.find((c) => c.key === catParam)?.key ?? "all";

  const [assets, totalByCategory] = await Promise.all([
    prisma.mediaAsset.findMany({
      where: {
        isEnabled: true,
        ...(category === "all" ? {} : { category }),
      },
      orderBy: { createdAt: "desc" },
      take: 60,
    }),
    prisma.mediaAsset.groupBy({
      by: ["category"],
      where: { isEnabled: true },
      _count: { _all: true },
    }),
  ]);

  const countByCat = new Map<string, number>();
  for (const row of totalByCategory) countByCat.set(row.category, row._count._all);
  const totalAll = Array.from(countByCat.values()).reduce((a, b) => a + b, 0);

  return (
    <div className="page-head">
      <div>
        <span className="eyebrow">◩ Media Library</span>
        <h2 style={{ marginTop: 14 }}>图片素材库</h2>
        <p className="page-head__sub">
          运营上传的图片素材按场景分类管理，供前台首页、社区、试验详情引用。
          <br />
          <span style={{ color: "var(--gray-500)" }}>
            本里程碑为骨架：单文件 ≤ 2MB，无自动压缩（M8.2 引入）；无素材时前端走色块 + 文字占位，不暴露破图。
          </span>
        </p>
      </div>

      <div style={{ marginTop: 28 }}>
        <MediaUploadForm />
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {CATEGORIES.map((c) => {
          const count = c.key === "all" ? totalAll : (countByCat.get(c.key) ?? 0);
          const active = category === c.key;
          return (
            <Link
              key={c.key}
              href={c.key === "all" ? "/admin/media" : `/admin/media?category=${c.key}`}
              style={{
                padding: "6px 14px",
                borderRadius: "var(--r-pill)",
                background: active ? "var(--ink-900)" : "var(--cream-0)",
                color: active ? "var(--cream-50)" : "var(--ink-900)",
                border: active ? "1px solid var(--ink-900)" : "1px solid var(--ink-200)",
                fontSize: "var(--fs-sm)",
                textDecoration: "none",
                display: "inline-flex",
                gap: 6,
                alignItems: "center",
              }}
            >
              {c.label}
              <span style={{ opacity: 0.7, fontFamily: "var(--font-mono)", fontSize: 11 }}>
                {count}
              </span>
            </Link>
          );
        })}
      </div>

      {assets.length === 0 ? (
        <div
          style={{
            padding: 40,
            textAlign: "center",
            background: "var(--cream-0)",
            border: "var(--border)",
            borderRadius: "var(--r-md)",
            color: "var(--gray-500)",
          }}
        >
          还没有素材。上面先传几张试试——无素材时前台会走默认色块占位，不会暴露破图。
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: 16,
          }}
        >
          {assets.map((asset) => (
            <div
              key={asset.id}
              style={{
                background: "var(--cream-0)",
                border: "var(--border)",
                borderRadius: "var(--r-md)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  aspectRatio: "4 / 3",
                  background: "var(--ink-100)",
                  backgroundImage: `url(${asset.url})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
                role="img"
                aria-label={asset.originalName}
              />
              <div style={{ padding: "10px 12px" }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: "var(--ink-900)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                  title={asset.originalName}
                >
                  {asset.originalName}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--gray-500)",
                    fontFamily: "var(--font-mono)",
                    marginTop: 2,
                  }}
                >
                  {asset.category} · {formatBytes(asset.sizeBytes)}
                </div>
                <code
                  style={{
                    display: "block",
                    marginTop: 6,
                    fontSize: 10,
                    fontFamily: "var(--font-mono)",
                    background: "var(--ink-100)",
                    padding: "3px 6px",
                    borderRadius: "var(--r-sm)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                  title={asset.url}
                >
                  {asset.url}
                </code>
                <MediaCardActions
                  id={asset.id}
                  isEnabled={asset.isEnabled}
                  url={asset.url}
                  category={asset.category}
                  overlayLabel={asset.overlayLabel}
                  overlayText={asset.overlayText}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
