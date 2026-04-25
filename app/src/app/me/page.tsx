import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteShell } from "@/components/SiteShell";
import { prisma } from "@/lib/prisma";
import { getUserSession, isLoggedIn } from "@/lib/user-session";
import { userLogout } from "@/lib/actions/user-auth";
import { recommendGroups, type DiseaseTag } from "@/lib/disease-matcher";
import { MyRecordsSection } from "./MyRecordsSection";
import type { RecommendedGroup } from "./RecommendModal";
import { RecommendModalWrapper } from "./RecommendModalWrapper";
import "./styles.css";

export const metadata = {
  title: "我的报名 · 九泰临研",
};

type StageState = "done" | "current" | "pending";

const STAGE_FLOW = [
  { key: "submitted", label: "已提交" },
  { key: "in_review", label: "预筛审核" },
  { key: "contacted", label: "已联系" },
  { key: "enrolled", label: "已入组" },
  { key: "closed", label: "已关闭" },
];
const STAGE_INDEX: Record<string, number> = {
  submitted: 0,
  in_review: 1,
  contacted: 2,
  enrolled: 3,
  withdrawn: 4,
  closed: 4,
};
const STAGE_LABEL: Record<string, string> = {
  submitted: "已提交",
  in_review: "预筛审核",
  contacted: "已联系",
  enrolled: "已入组",
  withdrawn: "已退出",
  closed: "已关闭",
};
const STAGE_TONE: Record<string, "info" | "success" | "plain"> = {
  submitted: "info",
  in_review: "info",
  contacted: "info",
  enrolled: "success",
  withdrawn: "plain",
  closed: "plain",
};

function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function stageDotChar(state: StageState, idx: number) {
  if (state === "done") return "✓";
  if (state === "current") return "●";
  return String(idx);
}

function badgeClass(tone: "info" | "success" | "plain") {
  if (tone === "info") return "badge badge--info";
  if (tone === "success") return "badge badge--success";
  return "badge badge--plain";
}

function deriveStages(current: string) {
  const currentIdx = STAGE_INDEX[current] ?? 0;
  return STAGE_FLOW.map((s, idx) => ({
    label: s.label,
    state:
      idx < currentIdx
        ? ("done" as StageState)
        : idx === currentIdx
          ? ("current" as StageState)
          : ("pending" as StageState),
  }));
}

export default async function MyApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; recommend?: string }>;
}) {
  const session = await getUserSession();
  if (!isLoggedIn(session)) {
    redirect("/auth?next=/me");
  }

  const { filter = "all", recommend } = await searchParams;

  const [user, allApps, medicalRecords] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.userId } }),
    prisma.application.findMany({
      where: { userId: session.userId },
      include: {
        trial: {
          select: {
            slug: true,
            title: true,
            disease: true,
            phase: true,
            city: true,
            siteName: true,
            contactPerson: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.userMedicalRecord.findMany({
      where: { userId: session.userId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        originalName: true,
        sizeBytes: true,
        createdAt: true,
      },
    }),
  ]);

  // 推荐分区弹窗：仅当 ?recommend=communities 且 dismissedAt 为 null 时触发
  let recommendedGroups: RecommendedGroup[] = [];
  if (recommend === "communities" && user && !user.recommendDismissedAt) {
    let userTags: DiseaseTag[] = [];
    if (user.aiDiseaseTags) {
      try {
        const parsed: unknown = JSON.parse(user.aiDiseaseTags);
        if (Array.isArray(parsed)) userTags = parsed as DiseaseTag[];
      } catch {
        // malformed json, stay empty
      }
    }

    if (userTags.length > 0) {
      // 查询所有已启用分区（完整对象，因为 recommendGroups 需要 CommunityGroup 类型）
      const allGroups = await prisma.communityGroup.findMany({
        where: { isEnabled: true },
        orderBy: { sortOrder: "asc" },
      });

      // 排除用户已加入的分区
      const joinedGroupIds = new Set(
        (
          await prisma.userGroupMembership.findMany({
            where: { userId: session.userId, leftAt: null },
            select: { groupId: true },
          })
        ).map((m) => m.groupId),
      );

      const notJoinedGroups = allGroups.filter((g) => !joinedGroupIds.has(g.id));

      const results = await recommendGroups(userTags, notJoinedGroups);
      recommendedGroups = results.slice(0, 3).map((r) => ({
        id: r.group.id,
        slug: r.group.slug,
        name: r.group.name,
        introduction: r.group.introduction ?? null,
      }));
    }
  }

  const total = allApps.length;
  const followingCount = allApps.filter((a) => STAGE_TONE[a.stage] !== "plain").length;
  const closedCount = allApps.filter((a) => STAGE_TONE[a.stage] === "plain").length;

  const apps =
    filter === "following"
      ? allApps.filter((a) => STAGE_TONE[a.stage] !== "plain")
      : filter === "closed"
        ? allApps.filter((a) => STAGE_TONE[a.stage] === "plain")
        : allApps;

  const totalLabel = `/ ${String(total).padStart(2, "0")}`;

  const displayName =
    user?.displayName ||
    user?.name ||
    (user?.phone ? `${user.phone.slice(0, 3)}****${user.phone.slice(7)}` : "用户");
  const avatarInitial = (user?.name ?? user?.displayName ?? "U").slice(0, 1);

  return (
    <SiteShell current="me">
      <main id="main" className="me-shell">
        <div className="container">
          <div className="me-hero">
            <span className="eyebrow">★ 个人中心</span>
            <h1 style={{ marginTop: 14 }}>
              你好，<em>{displayName}</em>
            </h1>
            <p className="muted" style={{ fontSize: "var(--fs-lg)", maxWidth: "50ch" }}>
              这里是你的报名记录和个人资料。
            </p>
          </div>

          <div className="me-grid">
            <aside className="me-side">
              <div className="me-profile">
                <div className="me-profile__avatar">{avatarInitial}</div>
                <div className="me-profile__name">{displayName}</div>
                <div className="me-profile__phone">
                  {user?.phone
                    ? `${user.phone.slice(0, 3)} **** ${user.phone.slice(7)}`
                    : ""}
                </div>
              </div>
              <nav className="me-nav" aria-label="个人中心">
                <Link href="/me" aria-current="page">
                  <span>我的报名</span>
                  <span className="count">{total}</span>
                </Link>
                <Link href="/trials">
                  <span>浏览试验</span>
                </Link>
                <Link href="/about">
                  <span>了解更多</span>
                </Link>
                <form action={userLogout} style={{ marginTop: 20 }}>
                  <button
                    type="submit"
                    style={{
                      width: "100%",
                      background: "transparent",
                      border: "1px solid var(--ink-200)",
                      color: "var(--gray-600)",
                      padding: "8px 12px",
                      borderRadius: 8,
                      cursor: "pointer",
                      fontSize: 14,
                    }}
                  >
                    退出登录
                  </button>
                </form>
              </nav>
            </aside>

            <section>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-end",
                  marginBottom: 24,
                  flexWrap: "wrap",
                  gap: 14,
                }}
              >
                <h2
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: 48,
                    fontWeight: 400,
                    letterSpacing: "-.02em",
                  }}
                >
                  我的报名{" "}
                  <em style={{ color: "var(--accent)", fontStyle: "italic" }}>{totalLabel}</em>
                </h2>
              </div>
              <div className="filter-row">
                <Link href="/me?filter=all" className={filter === "all" ? "btn btn--ink btn--sm" : "btn btn--ghost btn--sm"}>全部 ({total})</Link>
                <Link href="/me?filter=following" className={filter === "following" ? "btn btn--ink btn--sm" : "btn btn--ghost btn--sm"}>跟进中 ({followingCount})</Link>
                <Link href="/me?filter=closed" className={filter === "closed" ? "btn btn--ink btn--sm" : "btn btn--ghost btn--sm"}>已关闭 ({closedCount})</Link>
              </div>

              {apps.length === 0 ? (
                <div
                  style={{
                    padding: "56px 40px",
                    textAlign: "center",
                    background: "var(--cream-0)",
                    border: "var(--border)",
                    borderRadius: "var(--r-2xl)",
                    marginTop: 16,
                  }}
                >
                  <p style={{ fontSize: "var(--fs-lg)", marginBottom: 14 }}>
                    你还没有提交过预筛报名。
                  </p>
                  <Link href="/trials" className="btn btn--primary btn--lg">
                    浏览招募中的试验 <span className="arrow">→</span>
                  </Link>
                </div>
              ) : null}

              {apps.map((app) => {
                const tone = STAGE_TONE[app.stage] ?? "info";
                const stages = deriveStages(app.stage);
                const submissionId = `PS-${fmtDate(app.createdAt).replace(/-/g, "")}-${app.id.slice(-6).toUpperCase()}`;
                return (
                  <article key={app.id} className="application">
                    <div className="application__head">
                      <div>
                        <div
                          style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}
                        >
                          <span className="tag">{app.trial.disease}</span>
                          {app.trial.phase ? <span className="tag">{app.trial.phase} 期</span> : null}
                        </div>
                        <div className="application__title">
                          <Link href={`/trials/${app.trial.slug}`}>{app.trial.title}</Link>
                        </div>
                      </div>
                      <span className={badgeClass(tone)}>{STAGE_LABEL[app.stage] ?? app.stage}</span>
                    </div>
                    <div className="application__meta">
                      <span>★ {submissionId}</span>
                      <span>★ {fmtDate(app.createdAt)} 提交</span>
                      {app.trial.siteName ? (
                        <span>📍 {app.trial.siteName}</span>
                      ) : (
                        <span>📍 {app.trial.city}</span>
                      )}
                      {app.trial.contactPerson ? <span>👤 {app.trial.contactPerson}</span> : null}
                    </div>

                    <div className="stage-flow">
                      {stages.map((stage, idx) => {
                        const cls =
                          stage.state === "done"
                            ? "stage stage--done"
                            : stage.state === "current"
                              ? "stage stage--current"
                              : "stage";
                        return (
                          <div key={`${app.id}-${idx}`} className={cls}>
                            <div className="stage__dot">{stageDotChar(stage.state, idx + 1)}</div>
                            <span className="stage__label">{stage.label}</span>
                          </div>
                        );
                      })}
                    </div>

                    {app.nextAction ? (
                      <div
                        style={{
                          marginTop: 18,
                          padding: "14px 16px",
                          background: "var(--info-50)",
                          borderRadius: 10,
                          fontSize: "var(--fs-sm)",
                          color: "var(--info-700)",
                          fontFamily: "var(--font-sans)",
                        }}
                      >
                        ℹ️ {app.nextAction}
                      </div>
                    ) : null}
                  </article>
                );
              })}

              {apps.length > 0 ? (
                <p
                  className="muted small text-center mt-8"
                  style={{
                    fontFamily: "var(--font-mono)",
                    letterSpacing: ".04em",
                    textTransform: "uppercase",
                  }}
                >
                  已显示全部 {total} 条记录
                </p>
              ) : null}

              <MyRecordsSection initialRecords={medicalRecords} />
            </section>
          </div>
        </div>
      </main>

      {/* 推荐分区弹窗 + 常驻入口：由 server component 预算，传给 client component */}
      <RecommendModalWrapper
        recommendedGroups={recommendedGroups}
        dismissed={!!(user?.recommendDismissedAt)}
      />
    </SiteShell>
  );
}
