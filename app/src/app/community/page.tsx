import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { SiteShell } from "@/components/SiteShell";
import { prisma } from "@/lib/prisma";
import { getUserSession, isLoggedIn } from "@/lib/user-session";
import { recommendGroups } from "@/lib/disease-matcher";
import type { DiseaseTag } from "@/lib/disease-matcher";
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
  const session = await getUserSession();
  if (!isLoggedIn(session)) {
    redirect("/auth?next=/community");
  }

  const [user, memberships, allGroups] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { aiDiseaseTags: true },
    }),
    prisma.userGroupMembership.findMany({
      where: { userId: session.userId, leftAt: null },
      include: { group: true },
    }),
    prisma.communityGroup.findMany({
      where: { isEnabled: true },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  const userTags: DiseaseTag[] = (() => {
    if (!user?.aiDiseaseTags) return [];
    try {
      const parsed: unknown = JSON.parse(user.aiDiseaseTags);
      return Array.isArray(parsed) ? (parsed as DiseaseTag[]) : [];
    } catch {
      return [];
    }
  })();

  const joinedIds = new Set(memberships.map((m) => m.groupId));
  const joinedGroups = memberships.map((m) => m.group);
  const candidates = allGroups.filter((g) => !joinedIds.has(g.id));

  const recommended =
    userTags.length > 0
      ? (await recommendGroups(userTags, candidates, "string")).slice(0, 3)
      : [];

  const recommendedIds = new Set(recommended.map((r) => r.group.id));
  const others = candidates.filter((g) => !recommendedIds.has(g.id));

  const hasJoined = joinedGroups.length > 0;
  const atLimit = joinedGroups.length >= 3;
  const canPost = hasJoined;

  return (
    <SiteShell current="community">
      <main className="cm-shell">
        <div className="container">
          {/* 顶部 header */}
          <div className="cm-v2-header">
            <div>
              <span className="eyebrow">★ 病友互助</span>
              <h1 className="cm-v2-title">
                病友社区 <em>/ 我的分区</em>
              </h1>
            </div>
            <div className="cm-v2-header-actions">
              {canPost ? (
                <Link href="/community/new" className="btn btn--ink">
                  发帖 <span className="arrow">→</span>
                </Link>
              ) : (
                <button className="btn btn--ink" disabled title="先加入一个分区再发帖">
                  发帖（先加入分区）
                </button>
              )}
            </div>
          </div>

          <div className="cm-disclaimer">
            <span className="prefix">★ 提醒</span>
            社区内容仅供病友交流参考，<strong>不能替代医生的专业建议</strong>
            。遇到紧急不适请直接就医或拨打 120。
          </div>

          {/* 段一：我加入的分区 */}
          <section className="cm-v2-section">
            <h2 className="cm-section-title">
              <span className="num">/ 01</span> 我加入的分区
            </h2>
            {hasJoined ? (
              <>
                <div className="cm-chip-row">
                  {joinedGroups.slice(0, 3).map((g) => (
                    <Link
                      key={g.id}
                      href={`/community/${g.slug}`}
                      className="cm-chip"
                    >
                      {g.name}
                    </Link>
                  ))}
                </div>
                {atLimit && (
                  <p className="cm-v2-hint">
                    已加入 3 个分区（上限），想加入新分区请先在「我的 · 我的分区」退出一个
                  </p>
                )}
              </>
            ) : (
              <p className="cm-v2-hint">还没加入任何分区，看看下面的推荐？</p>
            )}
          </section>

          {/* 段二：推荐加入 */}
          {recommended.length > 0 && !atLimit && (
            <section className="cm-v2-section">
              <h2 className="cm-section-title">
                <span className="num">/ 02</span> 推荐加入
              </h2>
              <div className="cm-rec-grid">
                {recommended.map(({ group, matchedKeywords }) => {
                  const reason =
                    matchedKeywords.length > 0
                      ? `因为你填了「${matchedKeywords[0]}」相关症状`
                      : "与你填写的症状相关";
                  return (
                    <div key={group.id} className="cm-rec-card">
                      <div
                        className="cm-rec-card__cover"
                        style={{
                          background: `hsl(${(group.sortOrder * 47 + 200) % 360} 40% 70%)`,
                        }}
                      />
                      <div className="cm-rec-card__body">
                        <div className="cm-rec-card__name">{group.name}</div>
                        {group.introduction && (
                          <div className="cm-rec-card__intro">{group.introduction}</div>
                        )}
                        <div className="cm-rec-card__reason">{reason}</div>
                        <div className="cm-rec-card__foot">
                          <Link
                            href={`/community/join/${group.slug}`}
                            className="btn btn--ink btn--sm"
                          >
                            加入
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* 段三：其他可加入分区 */}
          {others.length > 0 && !atLimit && (
            <section className="cm-v2-section">
              <h2 className="cm-section-title">
                <span className="num">{recommended.length > 0 ? "/ 03" : "/ 02"}</span> 其他可加入分区
              </h2>
              <div className="cm-rec-grid">
                {others.map((group) => (
                  <div key={group.id} className="cm-rec-card">
                    <div
                      className="cm-rec-card__cover"
                      style={{
                        background: `hsl(${(group.sortOrder * 37 + 120) % 360} 30% 75%)`,
                      }}
                    />
                    <div className="cm-rec-card__body">
                      <div className="cm-rec-card__name">{group.name}</div>
                      {group.introduction && (
                        <div className="cm-rec-card__intro">{group.introduction}</div>
                      )}
                      <div className="cm-rec-card__foot">
                        <Link
                          href={`/community/join/${group.slug}`}
                          className="btn btn--ink btn--sm"
                        >
                          加入
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 空状态：无任何分区 */}
          {allGroups.length === 0 && (
            <div className="cm-empty">
              <h3>社区正在准备中</h3>
              <p>分区即将开放，请稍后再来。</p>
            </div>
          )}
        </div>
      </main>
    </SiteShell>
  );
}
