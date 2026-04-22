import Link from "next/link";
import { anonymousTag, relativeTime } from "@/lib/community-utils";

type PostCardInput = {
  id: string;
  title: string;
  content: string;
  postType: string;
  isAnonymous: boolean;
  authorUserId: string | null;
  authorRole: string;
  isFeatured: boolean;
  reviewStatus: string;
  createdAt: Date;
  group: { id: string; slug: string; name: string };
  _count?: { comments: number };
};

export function PostCard({ post }: { post: PostCardInput }) {
  const isOfficial = post.authorRole === "operator";
  const className = isOfficial
    ? "cm-post-card cm-post-card--official"
    : post.isFeatured
      ? "cm-post-card cm-post-card--featured"
      : "cm-post-card";

  const authorLabel = isOfficial
    ? "九泰运营 · 官方答复"
    : post.isAnonymous || !post.authorUserId
      ? `匿名患者 ${anonymousTag(post.authorUserId ?? "ghost", post.group.id)}`
      : "实名病友";

  return (
    <Link href={`/community/posts/${post.id}`} className={className}>
      <div className="cm-post-card__tagrow">
        {isOfficial ? <span className="cm-tag cm-tag--official">✓ 官方答复</span> : null}
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
      <h3 className="cm-post-card__title">{post.title}</h3>
      <p className="cm-post-card__summary">{post.content}</p>
      <div className="cm-post-card__meta">
        <span>{authorLabel}</span>
        <span>·</span>
        <span>{relativeTime(post.createdAt)}</span>
        {post._count ? (
          <>
            <span>·</span>
            <span>{post._count.comments} 条回复</span>
          </>
        ) : null}
      </div>
    </Link>
  );
}
