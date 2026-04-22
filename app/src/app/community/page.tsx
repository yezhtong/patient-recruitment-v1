import Link from "next/link";
import type { Metadata } from "next";
import { SiteShell } from "@/components/SiteShell";
import { prisma } from "@/lib/prisma";
import { PostCard } from "./PostCard";
import "./community.css";

export const metadata: Metadata = {
  title: "病友社区 · 九泰临研",
  description:
    "按病种划分的病友互助社区，可以匿名提问、分享治疗经验、从相关试验中找到下一步方向。",
  openGraph: {
    title: "病友社区 · 九泰临研",
    description: "按病种划分的病友互助社区，匿名提问 / 经验分享 / 相关试验。",
    url: "/community",
    type: "website",
  },
};

export default async function CommunityHomePage() {
  const [groups, featured, latest] = await Promise.all([
    prisma.communityGroup.findMany({
      where: { isEnabled: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: { _count: { select: { posts: true } } },
    }),
    prisma.communityPost.findMany({
      where: {
        OR: [{ isFeatured: true }, { authorRole: "operator" }],
        reviewStatus: { in: ["approved", "featured"] },
      },
      orderBy: { createdAt: "desc" },
      include: {
        group: { select: { id: true, slug: true, name: true } },
        _count: { select: { comments: true } },
      },
      take: 3,
    }),
    prisma.communityPost.findMany({
      where: { reviewStatus: { in: ["approved", "featured"] } },
      orderBy: { createdAt: "desc" },
      include: {
        group: { select: { id: true, slug: true, name: true } },
        _count: { select: { comments: true } },
      },
      take: 10,
    }),
  ]);

  return (
    <SiteShell current="community">
      <main className="cm-shell">
        <div className="container">
          <section className="cm-hero">
            <span className="eyebrow">★ 病友互助</span>
            <h1>
              病友讨论 <em>/ 经验分享</em>
            </h1>
            <p className="lead">
              和你有相同经历的人在这里分享故事、提出疑问、互相鼓励。运营会把高频问题沉淀到官方 FAQ。
            </p>
            <div className="cta-row">
              <Link href="/community/new" className="btn btn--ink btn--lg">
                发布新帖 <span className="arrow">→</span>
              </Link>
              <Link href="/faq" className="btn btn--text">
                浏览官方 FAQ →
              </Link>
            </div>
          </section>

          <div className="cm-disclaimer">
            <span className="prefix">★ 提醒</span>
            社区内容仅供病友交流参考，<strong>不能替代医生的专业建议</strong>
            。遇到紧急不适请直接就医或拨打 120。
          </div>

          <h2 className="cm-section-title">
            <span className="num">/ 01</span> 按病种加入讨论
          </h2>
          <div className="cm-group-grid">
            {groups.map((g) => (
              <Link
                key={g.id}
                href={`/community/${g.slug}`}
                className="cm-group-card"
              >
                <div className="cm-group-card__name">{g.name}</div>
                <div className="cm-group-card__meta">
                  {g._count.posts > 0 ? (
                    <>
                      <strong>{g._count.posts}</strong> 帖
                    </>
                  ) : (
                    "暂无讨论，成为第一个发帖的人"
                  )}
                </div>
              </Link>
            ))}
          </div>

          {featured.length > 0 ? (
            <>
              <h2 className="cm-section-title">
                <span className="num">/ 02</span> 精选 / 官方
              </h2>
              <div className="cm-post-list">
                {featured.map((p) => (
                  <PostCard key={p.id} post={p} />
                ))}
              </div>
            </>
          ) : null}

          <h2 className="cm-section-title">
            <span className="num">/ 03</span> 最新讨论
          </h2>
          {latest.length > 0 ? (
            <div className="cm-post-list">
              {latest.map((p) => (
                <PostCard key={p.id} post={p} />
              ))}
            </div>
          ) : (
            <div className="cm-empty">
              <h3>还没有讨论</h3>
              <p>成为第一个发帖的人，把你的疑问或经验留下来。</p>
              <div style={{ marginTop: 14 }}>
                <Link href="/community/new" className="btn btn--ink">
                  发布新帖 <span className="arrow">→</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </SiteShell>
  );
}
