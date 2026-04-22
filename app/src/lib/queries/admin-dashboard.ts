import { prisma } from "@/lib/prisma";

export type KpiRange = "7d" | "30d";

function rangeDays(range: KpiRange): number {
  return range === "30d" ? 30 : 7;
}

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

function pctDelta(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

export interface KpiCard {
  key: string;
  label: string;
  value: number;
  hint: string;
  delta?: number;
  prev?: number;
  deltaLabel?: string;
}

export async function getKpiCards(range: KpiRange): Promise<KpiCard[]> {
  const days = rangeDays(range);
  const now = new Date();
  const cur = daysAgo(days);
  const prev = daysAgo(days * 2);

  const [
    recentLeads,
    prevLeads,
    recentApps,
    prevApps,
    pendingNewLead,
    pendingCommunity,
    recruitingTrials,
    enrolledCount,
  ] = await Promise.all([
    prisma.lead.count({ where: { createdAt: { gte: cur } } }),
    prisma.lead.count({ where: { createdAt: { gte: prev, lt: cur } } }),
    prisma.application.count({ where: { createdAt: { gte: cur } } }),
    prisma.application.count({ where: { createdAt: { gte: prev, lt: cur } } }),
    prisma.lead.count({ where: { status: "submitted" } }),
    prisma.communityPost.count({ where: { reviewStatus: "pending" } }),
    prisma.clinicalTrial.count({ where: { status: "recruiting" } }),
    prisma.application.count({ where: { stage: "enrolled" } }),
  ]);

  void now;

  const rangeLabel = range === "30d" ? "近 30 天" : "近 7 天";
  const prevLabel = range === "30d" ? "vs 上 30 天" : "vs 上 7 天";

  return [
    {
      key: "recent-leads",
      label: `${rangeLabel}新增线索`,
      value: recentLeads,
      hint: `${prevLabel} ${prevLeads} 条`,
      delta: pctDelta(recentLeads, prevLeads),
      prev: prevLeads,
      deltaLabel: prevLabel,
    },
    {
      key: "recent-apps",
      label: `${rangeLabel}新增报名`,
      value: recentApps,
      hint: `${prevLabel} ${prevApps} 条`,
      delta: pctDelta(recentApps, prevApps),
      prev: prevApps,
      deltaLabel: prevLabel,
    },
    {
      key: "pending-new-lead",
      label: "待跟进线索",
      value: pendingNewLead,
      hint: "status = submitted",
    },
    {
      key: "pending-community",
      label: "社区待审核",
      value: pendingCommunity,
      hint: "reviewStatus = pending",
    },
    {
      key: "recruiting-trials",
      label: "招募中试验",
      value: recruitingTrials,
      hint: "status = recruiting",
    },
    {
      key: "enrolled-count",
      label: "累计入组",
      value: enrolledCount,
      hint: "stage = enrolled",
    },
  ];
}

export interface LeadFunnel {
  submitted: number;
  in_review: number;
  contacted: number;
  enrolled: number;
  disqualified: number;
  closed: number;
  total: number;
  convReviewFromSubmitted: number;
  convEnrolledFromContacted: number;
}

export async function getLeadFunnel(): Promise<LeadFunnel> {
  const [submittedCount, inReviewCount, contactedCount, enrolledCount, disqualifiedCount, closedCount] =
    await Promise.all([
      prisma.lead.count({ where: { status: "submitted" } }),
      prisma.lead.count({ where: { status: "in_review" } }),
      prisma.lead.count({ where: { status: "contacted" } }),
      prisma.lead.count({ where: { status: "enrolled" } }),
      prisma.lead.count({ where: { status: "disqualified" } }),
      prisma.lead.count({ where: { status: "closed" } }),
    ]);

  const total = submittedCount + inReviewCount + contactedCount + enrolledCount + disqualifiedCount + closedCount;
  const convReviewFromSubmitted =
    submittedCount + inReviewCount === 0
      ? 0
      : Math.round((inReviewCount / (submittedCount + inReviewCount)) * 100);
  const convEnrolledFromContacted =
    contactedCount + enrolledCount === 0
      ? 0
      : Math.round((enrolledCount / (contactedCount + enrolledCount)) * 100);

  return {
    submitted: submittedCount,
    in_review: inReviewCount,
    contacted: contactedCount,
    enrolled: enrolledCount,
    disqualified: disqualifiedCount,
    closed: closedCount,
    total,
    convReviewFromSubmitted,
    convEnrolledFromContacted,
  };
}

export const APPLICATION_STAGES = [
  "submitted",
  "in_review",
  "contacted",
  "enrolled",
  "withdrawn",
  "closed",
] as const;

export type ApplicationStage = (typeof APPLICATION_STAGES)[number];

export const APPLICATION_STAGE_LABEL: Record<ApplicationStage, string> = {
  submitted: "已提交",
  in_review: "审核中",
  contacted: "已联系",
  enrolled: "已入组",
  withdrawn: "已退出",
  closed: "已关闭",
};

export interface ApplicationStageItem {
  stage: ApplicationStage;
  label: string;
  count: number;
}

export async function getApplicationStageDist(): Promise<ApplicationStageItem[]> {
  const counts = await Promise.all(
    APPLICATION_STAGES.map((stage) =>
      prisma.application.count({ where: { stage } })
    )
  );
  return APPLICATION_STAGES.map((stage, i) => ({
    stage,
    label: APPLICATION_STAGE_LABEL[stage],
    count: counts[i],
  }));
}

export interface TopTrialItem {
  id: string;
  slug: string;
  title: string;
  disease: string;
  city: string;
  status: string;
  recentLeadCount: number;
  totalLeadCount: number;
}

export async function getTopTrials(days = 30, limit = 5): Promise<TopTrialItem[]> {
  const since = daysAgo(days);

  // 分组取近 N 日每 trialId 的线索数
  const grouped = await prisma.lead.groupBy({
    by: ["trialId"],
    where: { createdAt: { gte: since } },
    _count: { _all: true },
    orderBy: { _count: { trialId: "desc" } },
    take: limit,
  });

  if (grouped.length === 0) {
    // 退化：近 30 日无新线索时按累计线索数降序补位
    const trials = await prisma.clinicalTrial.findMany({
      orderBy: { updatedAt: "desc" },
      take: limit,
    });
    const totals = await Promise.all(
      trials.map((t) => prisma.lead.count({ where: { trialId: t.id } }))
    );
    return trials.map((t, i) => ({
      id: t.id,
      slug: t.slug,
      title: t.title,
      disease: t.disease,
      city: t.city,
      status: t.status,
      recentLeadCount: 0,
      totalLeadCount: totals[i],
    }));
  }

  const trialIds = grouped.map((g) => g.trialId);
  const trials = await prisma.clinicalTrial.findMany({
    where: { id: { in: trialIds } },
  });
  const trialById = new Map(trials.map((t) => [t.id, t]));

  const totalCounts = await Promise.all(
    trialIds.map((id) => prisma.lead.count({ where: { trialId: id } }))
  );

  return grouped.map((g, i) => {
    const t = trialById.get(g.trialId);
    return {
      id: g.trialId,
      slug: t?.slug ?? "",
      title: t?.title ?? "(已删除试验)",
      disease: t?.disease ?? "—",
      city: t?.city ?? "—",
      status: t?.status ?? "unknown",
      recentLeadCount: g._count._all,
      totalLeadCount: totalCounts[i],
    };
  });
}

export interface TodoCounts {
  pendingLeads: number;
  pendingCommunityPosts: number;
  pendingApplications: number;
}

export async function getTodoCounts(): Promise<TodoCounts> {
  const [pendingLeads, pendingCommunityPosts, pendingApplications] = await Promise.all([
    prisma.lead.count({ where: { status: "submitted" } }),
    prisma.communityPost.count({ where: { reviewStatus: "pending" } }),
    prisma.application.count({ where: { stage: "submitted" } }),
  ]);
  return { pendingLeads, pendingCommunityPosts, pendingApplications };
}
