import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteShell } from "@/components/SiteShell";
import { prisma } from "@/lib/prisma";
import { anonymousTag, relativeTime } from "@/lib/community-utils";
import { getUserSession, isLoggedIn } from "@/lib/user-session";
import { CommentForm } from "./CommentForm";
import "../../community.css";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const post = await prisma.communityPost.findUnique({
    where: { id },
    select: { title: true, content: true, group: { select: { name: true } } },
  });
  if (!post) return { title: "帖子不存在" };
  return {
    title: `${post.title} · ${post.group.name}`,
    description: post.content.slice(0, 140),
    openGraph: {
      type: "article",
      title: post.title,
      description: post.content.slice(0, 140),
      url: `/community/posts/${id}`,
    },
  };
}

export default async function CommunityPostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const post = await prisma.communityPost.findUnique({
    where: { id },
    include: {
      group: true,
      authorUser: true,
      relatedTrial: true,
      comments: {
        where: { reviewStatus: { in: ["approved", "featured"] } },
        orderBy: { createdAt: "desc" },
        include: { authorUser: true },
      },
    },
  });
  if (!post || post.reviewStatus === "rejected" || post.reviewStatus === "hidden") {
    return notFound();
  }

  const session = await getUserSession();
  const viewerLoggedIn = isLoggedIn(session);

  // 相关试验：如果帖子未绑定特定 trial，则用 group.diseaseTag 找 1 条
  let relatedTrial = post.relatedTrial;
  if (!relatedTrial && post.group.diseaseTag) {
    relatedTrial = await prisma.clinicalTrial.findFirst({
      where: {
        disease: post.group.diseaseTag,
        status: "recruiting",
        isPublic: true,
      },
    });
  }

  const isOfficial = post.authorRole === "operator";
  const authorLabel = isOfficial
    ? "九泰运营"
    : post.isAnonymous || !post.authorUserId
      ? `匿名患者 ${anonymousTag(post.authorUserId ?? "ghost", post.group.id)}`
      : "实名病友";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "DiscussionForumPosting",
    headline: post.title,
    author: { "@type": "Person", name: authorLabel },
    datePublished: post.createdAt.toISOString(),
    articleBody: post.content,
    commentCount: post.comments.length,
  };

  return (
    <SiteShell current="community">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <main className="cm-shell">
        <div className="container">
          <div className="cm-breadcrumb">
            <Link href="/community">社区</Link> <span>/</span>{" "}
            <Link href={`/community/${post.group.slug}`}>{post.group.name}</Link>{" "}
            <span>/</span> <strong>当前帖子</strong>
          </div>

          <div className="cm-post-detail">
            <article className="cm-post-main">
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
                {isOfficial ? (
                  <span className="cm-tag cm-tag--official">✓ 官方答复</span>
                ) : null}
                {post.isFeatured && !isOfficial ? (
                  <span className="cm-tag cm-tag--featured">★ 精选</span>
                ) : null}
                <span
                  className={
                    post.postType === "question"
                      ? "cm-tag cm-tag--question"
                      : "cm-tag cm-tag--experience"
                  }
                >
                  {post.postType === "question" ? "提问" : "经验分享"}
                </span>
                <span className="cm-tag">{post.group.name}</span>
              </div>

              <h1>{post.title}</h1>

              <div className="author">
                <span
                  className={
                    isOfficial ? "cm-avatar cm-avatar--official" : "cm-avatar"
                  }
                >
                  {isOfficial ? "JT" : authorLabel.slice(-1)}
                </span>
                <strong>{authorLabel}</strong>
                <span>·</span>
                <span>{relativeTime(post.createdAt)}</span>
                <span>·</span>
                <span>💬 {post.comments.length}</span>
              </div>

              <div className="content">{post.content}</div>

              <div className="cm-disclaimer" style={{ margin: "28px 0 0" }}>
                <span className="prefix">★ 提醒</span>
                以上内容由用户自行发布，仅供交流参考，不能替代医生的专业建议。
              </div>

              {relatedTrial ? (
                <div className="cm-related-trial">
                  <span className="eyebrow">★ 相关招募中的试验</span>
                  <h3>{relatedTrial.title}</h3>
                  <div className="meta">
                    {relatedTrial.disease} · {relatedTrial.city}
                    {relatedTrial.targetEnrollment
                      ? ` · 限 ${relatedTrial.targetEnrollment} 名`
                      : ""}
                  </div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 6 }}>
                    <Link
                      href={`/prescreen/${relatedTrial.slug}`}
                      className="btn btn--primary"
                    >
                      立即预筛 <span className="arrow">→</span>
                    </Link>
                    <Link href={`/trials/${relatedTrial.slug}`} className="btn btn--text">
                      查看详情 →
                    </Link>
                  </div>
                </div>
              ) : null}

              <section className="cm-comments">
                <h2>评论 / {String(post.comments.length).padStart(2, "0")}</h2>
                {viewerLoggedIn ? (
                  <CommentForm postId={post.id} />
                ) : (
                  <div className="cm-comment-form" style={{ opacity: 0.7 }}>
                    <div style={{ textAlign: "center", color: "var(--gray-600)" }}>
                      <Link
                        href={`/auth?next=/community/posts/${post.id}`}
                        style={{ color: "var(--ink-900)", textDecoration: "underline" }}
                      >
                        登录后参与讨论 →
                      </Link>
                    </div>
                  </div>
                )}

                {post.comments.length === 0 ? (
                  <p
                    style={{
                      color: "var(--gray-500)",
                      fontSize: 14,
                      padding: "20px 0",
                      textAlign: "center",
                    }}
                  >
                    还没有评论，成为第一个回复的人。
                  </p>
                ) : (
                  post.comments.map((c) => {
                    const cLabel =
                      c.authorRole === "operator"
                        ? "九泰运营"
                        : c.isAnonymous || !c.authorUserId
                          ? `匿名患者 ${anonymousTag(c.authorUserId ?? "ghost", post.group.id)}`
                          : "实名病友";
                    const cIsOfficial = c.authorRole === "operator";
                    return (
                      <div key={c.id} className="cm-comment">
                        <div className="author">
                          <span
                            className={
                              cIsOfficial
                                ? "cm-avatar cm-avatar--official"
                                : "cm-avatar"
                            }
                          >
                            {cIsOfficial ? "JT" : cLabel.slice(-1)}
                          </span>
                          <strong style={{ color: "var(--ink-900)" }}>{cLabel}</strong>
                          <span>·</span>
                          <span>{relativeTime(c.createdAt)}</span>
                        </div>
                        <div className="content">{c.content}</div>
                      </div>
                    );
                  })
                )}
              </section>
            </article>

            <aside className="cm-side">
              <div className="cm-side-block">
                <h4>★ 本病种社区</h4>
                <Link href={`/community/${post.group.slug}`}>
                  → 浏览更多 {post.group.name} 讨论
                </Link>
                <Link href="/community">→ 返回社区首页</Link>
              </div>
              <div className="cm-side-block">
                <h4>★ 还不确定？</h4>
                <p
                  style={{
                    color: "var(--gray-600)",
                    fontSize: 13,
                    lineHeight: 1.7,
                    margin: "0 0 8px",
                  }}
                >
                  任何疑问都可以联系真人。工作日 9:00–18:00。
                </p>
                <Link href="/contact">→ 填留言表单</Link>
                <a href="tel:400-888-1688">→ 400-888-1688</a>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </SiteShell>
  );
}
