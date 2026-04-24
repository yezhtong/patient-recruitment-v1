"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getUserSession } from "@/lib/user-session";
import { requireAdmin } from "@/lib/admin-session";
import { scanText, summarizeHits } from "@/lib/sensitive-words";
import { writeAuditLog } from "@/lib/audit";
import { reviewContent } from "@/lib/community-review";
import { triggerFaqIfPostKeyword } from "@/lib/ai-account";

const postTypeEnum = z.enum(["question", "experience"]);
const createPostSchema = z.object({
  groupSlug: z.string().min(1),
  title: z.string().trim().min(4, "标题太短").max(60, "标题不超过 60 字"),
  content: z.string().trim().min(20, "正文至少 20 字").max(2000, "正文不超过 2000 字"),
  postType: postTypeEnum,
  isAnonymous: z.boolean(),
});

export type CreatePostResult =
  | {
      ok: true;
      postId: string;
      status: "approved" | "pending";
      message: string;
    }
  | {
      ok: false;
      error: string;
      status?: "rejected";
      reason?: string;
      hits?: Array<{ keyword: string; riskType: string; riskLevel: string }>;
    };

export async function createPost(input: {
  groupSlug: string;
  title: string;
  content: string;
  postType: "question" | "experience";
  isAnonymous: boolean;
}): Promise<CreatePostResult> {
  const session = await getUserSession();
  if (!session.userId) {
    return { ok: false, error: "请先登录后再发帖" };
  }

  const parsed = createPostSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "表单校验失败" };
  }
  const data = parsed.data;

  const group = await prisma.communityGroup.findUnique({
    where: { slug: data.groupSlug },
  });
  if (!group || !group.isEnabled) {
    return { ok: false, error: "分区不存在或已关闭" };
  }

  const author = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { role: true },
  });

  const outcome = await reviewContent({
    scenario: "post",
    title: data.title,
    content: data.content,
    authorUserId: session.userId,
  });

  if (outcome.reviewStatus === "rejected") {
    return {
      ok: false,
      error: "内容审核未通过，无法发布。",
      status: "rejected",
      reason: outcome.aiReviewReason,
      hits: outcome.sensitiveHit
        ? [{ keyword: outcome.sensitiveHit.keyword, riskType: "sensitive", riskLevel: outcome.sensitiveHit.level }]
        : [],
    };
  }

  // 收集敏感词命中（供 DB 记录，AI rejected 的 high 词不会走到这里）
  const hits = [
    ...(await scanText(data.title)),
    ...(await scanText(data.content)),
  ];

  const post = await prisma.communityPost.create({
    data: {
      groupId: group.id,
      authorUserId: session.userId,
      authorRole: author?.role ?? "patient",
      isAnonymous: data.isAnonymous,
      title: data.title,
      content: data.content,
      postType: data.postType,
      reviewStatus: outcome.reviewStatus,
      aiReviewedAt: new Date(),
      aiReviewResult: outcome.aiReviewResult,
      aiReviewConfidence: outcome.aiReviewConfidence,
      aiReviewReason: outcome.aiReviewReason,
      sensitiveHits: {
        create: hits.map((h) => ({
          keyword: h.keyword,
          riskType: h.riskType,
          riskLevel: h.riskLevel,
          snippet: h.snippet,
        })),
      },
    },
  });

  revalidatePath("/community");
  revalidatePath(`/community/${group.slug}`);

  triggerFaqIfPostKeyword({ postId: post.id }).catch(() => {});

  return {
    ok: true,
    postId: post.id,
    status: outcome.reviewStatus as "approved" | "pending",
    message:
      outcome.reviewStatus === "pending"
        ? "帖子已提交，正在审核中（预计 8 小时内）。"
        : "发布成功",
  };
}

const createCommentSchema = z.object({
  postId: z.string().min(1),
  content: z.string().trim().min(2).max(1000),
  isAnonymous: z.boolean(),
});

export type CreateCommentResult =
  | { ok: true; commentId: string; status: "approved" | "pending" }
  | { ok: false; error: string; status?: "rejected"; reason?: string };

export async function createComment(input: {
  postId: string;
  content: string;
  isAnonymous: boolean;
}): Promise<CreateCommentResult> {
  const session = await getUserSession();
  if (!session.userId) return { ok: false, error: "请先登录后再评论" };
  const parsed = createCommentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "校验失败" };
  const data = parsed.data;

  const post = await prisma.communityPost.findUnique({
    where: { id: data.postId },
  });
  if (!post || post.reviewStatus === "rejected" || post.reviewStatus === "hidden") {
    return { ok: false, error: "帖子不可用" };
  }

  const author = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { role: true },
  });

  const outcome = await reviewContent({
    scenario: "comment",
    content: data.content,
    authorUserId: session.userId,
  });

  if (outcome.reviewStatus === "rejected") {
    return {
      ok: false,
      error: "评论审核未通过，无法发布。",
      status: "rejected",
      reason: outcome.aiReviewReason,
    };
  }

  const hits = await scanText(data.content);

  const comment = await prisma.communityComment.create({
    data: {
      postId: post.id,
      authorUserId: session.userId,
      authorRole: author?.role ?? "patient",
      isAnonymous: data.isAnonymous,
      content: data.content,
      reviewStatus: outcome.reviewStatus,
      aiReviewedAt: new Date(),
      aiReviewResult: outcome.aiReviewResult,
      aiReviewConfidence: outcome.aiReviewConfidence,
      aiReviewReason: outcome.aiReviewReason,
      sensitiveHits: {
        create: hits.map((h) => ({
          keyword: h.keyword,
          riskType: h.riskType,
          riskLevel: h.riskLevel,
          snippet: h.snippet,
        })),
      },
    },
  });
  revalidatePath(`/community/posts/${post.id}`);
  return { ok: true, commentId: comment.id, status: outcome.reviewStatus as "approved" | "pending" };
}

const moderateSchema = z.object({
  postId: z.string(),
  action: z.enum(["approve", "reject", "hide", "feature", "unfeature"]),
  reason: z.string().max(500).optional(),
  humanOverride: z.string().max(500).optional(),
});

export async function moderatePost(input: {
  postId: string;
  action: "approve" | "reject" | "hide" | "feature" | "unfeature";
  reason?: string;
  humanOverride?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const session = await requireAdmin();
  const parsed = moderateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "参数错误" };

  const statusMap: Record<string, { reviewStatus?: string; isFeatured?: boolean }> = {
    approve: { reviewStatus: "approved" },
    reject: { reviewStatus: "rejected" },
    hide: { reviewStatus: "hidden" },
    feature: { reviewStatus: "featured", isFeatured: true },
    unfeature: { reviewStatus: "approved", isFeatured: false },
  };
  const patch = statusMap[parsed.data.action];

  const before = await prisma.communityPost.findUnique({
    where: { id: parsed.data.postId },
    select: {
      id: true,
      title: true,
      reviewStatus: true,
      isFeatured: true,
      aiReviewResult: true,
      group: { select: { name: true } },
    },
  });

  await prisma.communityPost.update({
    where: { id: parsed.data.postId },
    data: {
      ...patch,
      reviewedAt: new Date(),
      reviewedBy: session.operatorId,
      rejectReason: parsed.data.action === "reject" ? parsed.data.reason ?? null : null,
      humanOverride: parsed.data.humanOverride ?? null,
    },
  });
  await prisma.communityModerationLog.create({
    data: {
      postId: parsed.data.postId,
      action: parsed.data.action,
      operatorId: session.operatorId,
      reason: parsed.data.reason ?? parsed.data.humanOverride,
    },
  });

  const aiResult = before?.aiReviewResult ?? null;
  const humanAction = parsed.data.action;
  const aiHumanConsistent =
    aiResult === null
      ? null
      : (aiResult === "pass" && humanAction === "approve") ||
        (aiResult === "reject" && humanAction === "reject");

  if (before) {
    await writeAuditLog({
      session,
      action: "community.post.moderate",
      entityType: "community_post",
      entityId: before.id,
      summary: `Moderate community post: ${before.title} -> ${parsed.data.action}`,
      detail: {
        groupName: before.group.name,
        moderationAction: parsed.data.action,
        reason: parsed.data.reason ?? null,
        humanOverride: parsed.data.humanOverride ?? null,
        aiReviewResult: aiResult,
        humanAiConsistent: aiHumanConsistent,
        before: {
          reviewStatus: before.reviewStatus,
          isFeatured: before.isFeatured,
        },
        after: {
          reviewStatus: patch.reviewStatus ?? before.reviewStatus,
          isFeatured: patch.isFeatured ?? before.isFeatured,
        },
      },
    });
  }

  revalidatePath("/admin/community/posts");
  revalidatePath(`/admin/community/posts/${parsed.data.postId}`);
  revalidatePath("/community");
  return { ok: true };
}

export async function approveByAi(
  postId: string,
): Promise<{ ok: boolean; error?: string }> {
  const session = await requireAdmin();

  const post = await prisma.communityPost.findUnique({
    where: { id: postId },
    select: {
      id: true,
      title: true,
      reviewStatus: true,
      aiReviewResult: true,
      aiReviewReason: true,
      group: { select: { name: true } },
    },
  });
  if (!post) return { ok: false, error: "帖子不存在" };
  if (!post.aiReviewResult) return { ok: false, error: "该帖子尚无 AI 审核结论" };

  const newStatus = post.aiReviewResult === "pass" ? "approved" : "rejected";
  await prisma.communityPost.update({
    where: { id: postId },
    data: {
      reviewStatus: newStatus,
      reviewedAt: new Date(),
      reviewedBy: session.operatorId,
      rejectReason: post.aiReviewResult === "reject" ? (post.aiReviewReason ?? null) : null,
      humanOverride: null,
    },
  });
  await prisma.communityModerationLog.create({
    data: {
      postId,
      action: newStatus === "approved" ? "approve" : "reject",
      operatorId: session.operatorId,
      reason: "认同 AI 审核结论",
    },
  });
  await writeAuditLog({
    session,
    action: "community.post.ai_approve_by_admin",
    entityType: "community_post",
    entityId: post.id,
    summary: `Admin accepted AI decision for post: ${post.title} -> ${newStatus}`,
    detail: {
      groupName: post.group.name,
      aiReviewResult: post.aiReviewResult,
      humanDecision: newStatus,
      humanAiConsistent: true,
    },
  });

  revalidatePath("/admin/community/posts");
  revalidatePath(`/admin/community/posts/${postId}`);
  revalidatePath("/community");
  return { ok: true };
}
