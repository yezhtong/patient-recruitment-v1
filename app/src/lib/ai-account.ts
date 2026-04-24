import { prisma } from "@/lib/prisma";
import type { User } from "@/generated/prisma/client";

export const AI_SYSTEM_PHONE = "__system_ai__";

export async function getAiAccount(): Promise<User | null> {
  return prisma.user.findUnique({ where: { phone: AI_SYSTEM_PHONE } });
}

export async function triggerWelcomeIfFirstVisit(input: {
  userId: string;
  groupId: string;
}): Promise<{ posted: boolean; commentId?: string }> {
  const { userId, groupId } = input;

  const aiAccount = await getAiAccount();
  if (!aiAccount) return { posted: false };

  if (userId === aiAccount.id) return { posted: false };

  const group = await prisma.communityGroup.findUnique({
    where: { id: groupId },
    select: { id: true, name: true, allowAiComment: true },
  });
  if (!group || !group.allowAiComment) return { posted: false };

  const template = await prisma.aiAccountTemplate.findUnique({
    where: { scenario: "new_user_welcome" },
  });
  if (!template || !template.isEnabled) return { posted: false };

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, displayName: true, phone: true },
  });
  if (!user) return { posted: false };

  const latestPost = await prisma.communityPost.findFirst({
    where: { groupId: group.id, reviewStatus: { in: ["approved", "featured"] } },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  if (!latestPost) return { posted: false };

  const alreadyCommented = await prisma.communityComment.findFirst({
    where: {
      postId: latestPost.id,
      authorUserId: aiAccount.id,
      content: { contains: "欢迎" },
    },
    select: { id: true },
  });
  if (alreadyCommented) return { posted: false };

  const nickname =
    user.displayName ?? ("***" + user.phone.slice(-4));
  const content = template.contentTemplate
    .replace("{{nickname}}", nickname)
    .replace("{{groupName}}", group.name);

  const comment = await prisma.communityComment.create({
    data: {
      postId: latestPost.id,
      authorUserId: aiAccount.id,
      authorRole: "ai",
      isAnonymous: false,
      content,
      reviewStatus: "approved",
      isAiGenerated: true,
      aiReviewedAt: new Date(),
      aiReviewResult: "pass",
      aiReviewConfidence: 1.0,
    },
  });

  return { posted: true, commentId: comment.id };
}

export async function triggerFaqIfPostKeyword(input: {
  postId: string;
}): Promise<{ commented: boolean; commentId?: string }> {
  const { postId } = input;

  const aiAccount = await getAiAccount();
  if (!aiAccount) return { commented: false };

  const post = await prisma.communityPost.findUnique({
    where: { id: postId },
    select: {
      id: true,
      title: true,
      content: true,
      isAiGenerated: true,
      groupId: true,
      group: { select: { allowAiComment: true } },
    },
  });
  if (!post || post.isAiGenerated) return { commented: false };
  if (!post.group.allowAiComment) return { commented: false };

  const template = await prisma.aiAccountTemplate.findUnique({
    where: { scenario: "faq_post_trigger" },
  });
  if (!template || !template.isEnabled) return { commented: false };

  let keywords: string[] = [];
  try {
    const rule = JSON.parse(template.triggerRule) as { when: string; keywords?: string[] };
    keywords = rule.keywords ?? [];
  } catch {
    return { commented: false };
  }

  const combined = post.title + " " + post.content;
  const matched = keywords.some((kw) => combined.includes(kw));
  if (!matched) return { commented: false };

  const existing = await prisma.communityComment.findFirst({
    where: { postId, authorUserId: aiAccount.id },
    select: { id: true },
  });
  if (existing) return { commented: false };

  const comment = await prisma.communityComment.create({
    data: {
      postId,
      authorUserId: aiAccount.id,
      authorRole: "ai",
      isAnonymous: false,
      content: template.contentTemplate,
      reviewStatus: "approved",
      isAiGenerated: true,
      aiReviewedAt: new Date(),
      aiReviewResult: "pass",
      aiReviewConfidence: 1.0,
    },
  });

  return { commented: true, commentId: comment.id };
}
