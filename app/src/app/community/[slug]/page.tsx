import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteShell } from "@/components/SiteShell";
import { prisma } from "@/lib/prisma";
import { PostCard } from "../PostCard";
import "../community.css";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const g = await prisma.communityGroup.findUnique({
    where: { slug },
    select: { name: true, introduction: true },
  });
  if (!g) return { title: "社区分区不存在" };
  return {
    title: `${g.name} · 病友社区`,
    description: g.introduction ?? `${g.name} 的病友讨论与经验分享。`,
    openGraph: {
      title: `${g.name} · 病友社区`,
      description: g.introduction ?? undefined,
      url: `/community/${slug}`,
      type: "website",
    },
  };
}

export default async function CommunityGroupPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const group = await prisma.communityGroup.findUnique({
    where: { slug },
    include: { _count: { select: { posts: true } } },
  });
  if (!group || !group.isEnabled) return notFound();

  const [posts, relatedTrials] = await Promise.all([
    prisma.communityPost.findMany({
      where: {
        groupId: group.id,
        reviewStatus: { in: ["approved", "featured"] },
      },
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
      include: {
        group: { select: { id: true, slug: true, name: true } },
        _count: { select: { comments: true } },
      },
      take: 30,
    }),
    group.diseaseTag
      ? prisma.clinicalTrial.findMany({
          where: {
            disease: group.diseaseTag,
            status: "recruiting",
            isPublic: true,
          },
          orderBy: { createdAt: "desc" },
          take: 3,
        })
      : Promise.resolve([]),
  ]);

  return (
    <SiteShell current="community">
      <main className="cm-shell">
        <div className="container">
          <div className="cm-breadcrumb">
            <Link href="/community">社区</Link> <span>/</span>{" "}
            <strong>{group.name}</strong>
          </div>

          <section className="cm-hero">
            <span className="eyebrow">★ 病种社区</span>
            <h1>
              {group.name} <em>/ 一起聊</em>
            </h1>
            {group.introduction ? (
              <p className="lead">{group.introduction}</p>
            ) : null}
            <div className="cta-row">
              <Link
                href={`/community/new?group=${group.slug}`}
                className="btn btn--ink btn--lg"
              >
                发布新帖 <span className="arrow">→</span>
              </Link>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                  color: "var(--gray-500)",
                  letterSpacing: "0.04em",
                }}
              >
                {group._count.posts} 帖
              </span>
            </div>
          </section>

          <div className="cm-disclaimer">
            <span className="prefix">★ 提醒</span>
            社区内容仅供病友交流参考，<strong>不能替代医生的专业建议</strong>
            。遇到紧急不适请直接就医或拨打 120。
          </div>

          {relatedTrials.length > 0 ? (
            <>
              <h2 className="cm-section-title">
                <span className="num">/ 01</span> 本病种正在招募
              </h2>
              <div className="cm-post-list">
                {relatedTrials.map((t) => (
                  <div key={t.id} className="cm-related-trial">
                    <span className="eyebrow">★ 招募中</span>
                    <h3>{t.title}</h3>
                    <div className="meta">
                      {t.disease} · {t.city}
                      {t.targetEnrollment ? ` · 限 ${t.targetEnrollment} 名` : ""}
                    </div>
                    <div
                      style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 6 }}
                    >
                      <Link
                        href={`/prescreen/${t.slug}`}
                        className="btn btn--primary"
                      >
                        立即预筛 <span className="arrow">→</span>
                      </Link>
                      <Link href={`/trials/${t.slug}`} className="btn btn--text">
                        查看详情 →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : null}

          <h2 className="cm-section-title">
            <span className="num">/ {relatedTrials.length > 0 ? "02" : "01"}</span> 讨论列表
          </h2>
          {posts.length === 0 ? (
            <div className="cm-empty">
              <h3>还没有人在 {group.name} 里发帖</h3>
              <p>第一个发帖的人会帮到后面很多人。</p>
              <div style={{ marginTop: 14 }}>
                <Link
                  href={`/community/new?group=${group.slug}`}
                  className="btn btn--ink"
                >
                  发布新帖 <span className="arrow">→</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="cm-post-list">
              {posts.map((p) => (
                <PostCard key={p.id} post={p} />
              ))}
            </div>
          )}
        </div>
      </main>
    </SiteShell>
  );
}
