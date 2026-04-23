import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { SiteShell } from "@/components/SiteShell";
import { prisma } from "@/lib/prisma";
import { getUserSession } from "@/lib/user-session";
import { getAdminSession } from "@/lib/admin-session";
import { readGuestToken } from "@/lib/guest-token";
import { logTrialDetailView } from "@/lib/behavior-log";
import {
  countDistinctGuestTrialViews,
  GUEST_TRIAL_DETAIL_QUOTA,
  shouldLockUserForTrialViews,
} from "@/lib/rate-limit";
import "./styles.css";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const trial = await prisma.clinicalTrial.findUnique({
    where: { slug },
    select: { title: true, summary: true, disease: true, city: true },
  });
  if (!trial) return { title: "试验未找到" };
  const title = `${trial.title}`;
  const description = trial.summary;
  return {
    title,
    description,
    openGraph: {
      type: "article",
      title,
      description,
      url: `/trials/${slug}`,
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

const DEFAULT_FLOW = [
  { num: "01", title: "在线预筛", sub: "2 MIN" },
  { num: "02", title: "运营沟通", sub: "24H 内" },
  { num: "03", title: "中心面诊", sub: "1-2 次访视" },
  { num: "04", title: "入组治疗", sub: "按方案" },
];

const DEFAULT_FAQ = [
  {
    q: "参加这项研究安全吗？",
    a: "所有研究均经过国家药监局批准并通过伦理委员会审查，研究中心会全程监测参与者的安全指标。",
  },
  {
    q: "参加是否需要付费？",
    a: "研究用药和研究相关的检查均由项目方承担，部分中心还提供交通补贴。",
  },
  {
    q: "中途可以退出吗？",
    a: "完全可以。任何阶段你都可以申请退出，不会影响后续在该医院就诊。",
  },
];

function splitLines(v: string | null | undefined): string[] {
  if (!v) return [];
  return v
    .split(/\r?\n|；|;/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export default async function TrialDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const trial = await prisma.clinicalTrial.findUnique({ where: { slug } });
  if (!trial) return notFound();

  // ========== M8.1 · 反爬 / 游客配额 / 行为日志 ==========
  const userSession = await getUserSession();
  const adminSession = await getAdminSession();
  const userId = userSession.userId ?? null;
  const isAdminOrOperator = Boolean(adminSession.operatorId);
  // 白名单：admin / operator 不受反爬限制；doctor role 预留（M8.3 引入）

  // 游客配额剩余（用于底部"还可以看 X 条"提示）
  let guestRemaining: number | null = null;

  if (userId) {
    // 1) 先检查用户是否被封（防止绕过 middleware，比如直链访问 server component）
    const existingLock = await prisma.accountLock.findUnique({
      where: { userId },
    });
    if (existingLock && !existingLock.unlockedAt) {
      redirect("/account-locked");
    }

    // 2) 写一条 behavior log
    await logTrialDetailView({ userId, trialId: trial.id });

    // 3) 检查反爬阈值（包含刚写的这条）
    if (!isAdminOrOperator) {
      const { shouldLock, distinctCount } =
        await shouldLockUserForTrialViews(userId);
      if (shouldLock) {
        await prisma.accountLock.upsert({
          where: { userId },
          create: {
            userId,
            reason: `30 分钟内查看了 ${distinctCount} 条试验详情，触发反爬规则`,
            triggeredBy: "rate_limit:trial_detail_view",
          },
          update: {
            // 若历史有已解锁的记录，重新锁定
            unlockedAt: null,
            unlockedBy: null,
            unlockReason: null,
            reason: `30 分钟内查看了 ${distinctCount} 条试验详情，触发反爬规则`,
            triggeredBy: "rate_limit:trial_detail_view",
            lockedAt: new Date(),
            appealStatus: "none",
            appealText: null,
            appealedAt: null,
            appealReplyText: null,
            appealHandledBy: null,
            appealHandledAt: null,
          },
        });
        redirect("/account-locked");
      }
    }
  } else if (!isAdminOrOperator) {
    // 游客路径（guestToken 由 middleware 确保已写入 cookie）
    const guestToken = await readGuestToken();

    if (guestToken) {
      // 先看"已看过的不同试验数"（不含本次）
      const currentDistinctBefore = await countDistinctGuestTrialViews(guestToken);
      const alreadyViewedThis = await prisma.userBehaviorLog.findFirst({
        where: {
          guestToken,
          action: "trial_detail_view",
          targetId: trial.id,
        },
        select: { id: true },
      });

      const totalAfter = alreadyViewedThis
        ? currentDistinctBefore
        : currentDistinctBefore + 1;

      if (totalAfter > GUEST_TRIAL_DETAIL_QUOTA) {
        // 第 6 条起拦截，重定向到登录
        redirect(`/auth?reason=guest_limit&next=/trials/${slug}`);
      }

      // 允许访问：写一条 behavior log（重复查看同一 trial 不累计配额）
      await logTrialDetailView({ guestToken, trialId: trial.id });

      guestRemaining = GUEST_TRIAL_DETAIL_QUOTA - totalAfter;
    }
    // 若 middleware 尚未跑到（极端情况），本次放行，下次访问会被计数
  }
  // ========== M8.1 end ==========

  const statusLabel =
    trial.status === "recruiting"
      ? "招募中"
      : trial.status === "paused"
        ? "已暂停"
        : "已结束";

  const inclusionList = splitLines(trial.inclusionBrief);
  const exclusionList = splitLines(trial.exclusionBrief);
  const benefitsList = splitLines(trial.benefits);
  const followUpList = splitLines(trial.followUpPlan);

  const communityGroup = await prisma.communityGroup.findFirst({
    where: { diseaseTag: trial.disease, isEnabled: true },
    select: { slug: true, name: true },
  });

  const medicalStudyJsonLd = {
    "@context": "https://schema.org",
    "@type": "MedicalStudy",
    name: trial.title,
    description: trial.summary,
    studyLocation: {
      "@type": "AdministrativeArea",
      name: trial.city,
    },
    studySubject: {
      "@type": "MedicalCondition",
      name: trial.disease,
    },
    status:
      trial.status === "recruiting"
        ? "https://schema.org/ActiveActionStatus"
        : trial.status === "paused"
          ? "https://schema.org/PotentialActionStatus"
          : "https://schema.org/CompletedActionStatus",
    sponsor: trial.sponsor
      ? { "@type": "Organization", name: trial.sponsor }
      : undefined,
    healthCondition: trial.disease,
    phase: trial.phase ? `Phase ${trial.phase}` : undefined,
    contactPoint: trial.contactPhone
      ? {
          "@type": "ContactPoint",
          telephone: trial.contactPhone,
          contactType: "Patient Recruitment",
          name: trial.contactPerson ?? undefined,
        }
      : undefined,
  };

  return (
    <SiteShell current="trials">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(medicalStudyJsonLd) }}
      />
      <div className="container">
        <div className="breadcrumb" aria-label="面包屑">
          <Link href="/">首页</Link>
          <span>/</span>
          <Link href="/trials">找试验</Link>
          <span>/</span>
          <Link href={`/trials?d=${encodeURIComponent(trial.disease)}`}>{trial.disease}</Link>
          <span>/</span>
          <strong>当前项目</strong>
        </div>

        <header className="trial-hero">
          <div className="trial-hero__top">
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span className="tag tag--filled">{trial.disease}</span>
              {trial.phase ? <span className="tag">{trial.phase} 期</span> : null}
              {trial.city ? <span className="tag">{trial.city}</span> : null}
            </div>
            <span className={`badge ${trial.status === "recruiting" ? "badge--success" : "badge--plain"}`}>
              {statusLabel}
              {trial.targetEnrollment ? ` · 限 ${trial.targetEnrollment} 名` : ""}
            </span>
          </div>

          <h1>{trial.title}</h1>

          <div className="trial-hero__meta-bar">
            <div className="trial-hero__meta-item">
              <div className="label">研究中心</div>
              <div className="value">{trial.siteName ?? trial.city}</div>
            </div>
            <div className="trial-hero__meta-item">
              <div className="label">干预措施</div>
              <div className="value">{trial.intervention ?? "—"}</div>
            </div>
            <div className="trial-hero__meta-item">
              <div className="label">预筛耗时</div>
              <div className="value">约 2 分钟</div>
            </div>
            <div className="trial-hero__meta-item">
              <div className="label">参与费用</div>
              <div className="value" style={{ color: "var(--accent)" }}>免费</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link href={`/prescreen/${trial.slug}`} className="btn btn--primary btn--lg">
              立即预筛 <span className="arrow">→</span>
            </Link>
            {trial.contactPhone ? (
              <a href={`tel:${trial.contactPhone}`} className="btn btn--ghost btn--lg">
                📞 拨打 {trial.contactPhone}
              </a>
            ) : null}
          </div>
        </header>

        <div className="trial-detail-grid">
          <div>
            <section className="content-block">
              <h2><span className="num">/ 01</span> 项目一句话</h2>
              <p>{trial.summary}</p>
              {trial.description ? (
                <p style={{ marginTop: 16, whiteSpace: "pre-line" }}>{trial.description}</p>
              ) : null}
              {trial.sponsor ? (
                <p className="muted" style={{ marginTop: 12, fontSize: "var(--fs-sm)" }}>
                  ★ 申办方：{trial.sponsor}
                </p>
              ) : null}
              {trial.studyDesign ? (
                <p className="muted" style={{ marginTop: 6, fontSize: "var(--fs-sm)" }}>
                  ★ 研究设计：{trial.studyDesign}
                </p>
              ) : null}
            </section>

            <section className="content-block">
              <h2><span className="num">/ 02</span> 适合参加的人</h2>
              <div className="criteria-grid">
                <div className="criteria-card --ok">
                  <h4>你符合以下条件可能合适</h4>
                  <ul>
                    {(inclusionList.length
                      ? inclusionList
                      : ["请查看项目详情并联系运营确认"]).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div className="criteria-card --no">
                  <h4>以下情况暂不适合</h4>
                  <ul>
                    {(exclusionList.length
                      ? exclusionList
                      : ["具体排除标准请以研究方案为准"]).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", textTransform: "uppercase", letterSpacing: ".1em", color: "var(--gray-500)", marginTop: 24 }}>
                ★ 最终是否符合需经研究中心医生评估，预筛只用于初步筛查
              </p>
            </section>

            {benefitsList.length ? (
              <section className="content-block">
                <h2><span className="num">/ 03</span> 受试者获益</h2>
                <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: 10 }}>
                  {benefitsList.map((b) => (
                    <li
                      key={b}
                      style={{
                        padding: "14px 18px",
                        background: "var(--lime-soft)",
                        border: "1px solid var(--lime)",
                        borderRadius: "var(--r-md)",
                      }}
                    >
                      ✓ {b}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section className="content-block">
              <h2><span className="num">/ {benefitsList.length ? "04" : "03"}</span> 你需要走的流程</h2>
              <div className="flow-steps">
                {DEFAULT_FLOW.map((step) => (
                  <div key={step.num} className="flow-step">
                    <div className="flow-step__num">{step.num}</div>
                    <div className="flow-step__title">{step.title}</div>
                    <div className="flow-step__sub">{step.sub}</div>
                  </div>
                ))}
              </div>
            </section>

            {followUpList.length ? (
              <section className="content-block">
                <h2><span className="num">/ {benefitsList.length ? "05" : "04"}</span> 随访安排</h2>
                <ol style={{ paddingLeft: 20, lineHeight: 1.8 }}>
                  {followUpList.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ol>
              </section>
            ) : null}

            <section className="content-block">
              <h2><span className="num">/ {benefitsList.length ? (followUpList.length ? "06" : "05") : (followUpList.length ? "04" : "03")}</span> 研究中心 / 地址</h2>
              <div style={{ padding: 20, background: "var(--cream-0)", border: "var(--border)", borderRadius: "var(--r-xl)" }}>
                <h4 style={{ fontFamily: "var(--font-serif)", fontSize: 24, fontWeight: 400, marginBottom: 8 }}>
                  {trial.siteName ?? trial.city}
                </h4>
                {trial.siteAddress ? (
                  <p className="muted" style={{ fontSize: "var(--fs-sm)" }}>📍 {trial.siteAddress}</p>
                ) : null}
                {trial.contactPerson ? (
                  <p className="muted" style={{ fontSize: "var(--fs-sm)", marginTop: 6 }}>
                    👤 联系人：{trial.contactPerson}
                  </p>
                ) : null}
                {trial.contactPhone ? (
                  <p style={{ fontSize: "var(--fs-md)", marginTop: 10 }}>
                    📞 <a href={`tel:${trial.contactPhone}`} style={{ textDecoration: "underline" }}>{trial.contactPhone}</a>
                  </p>
                ) : null}
              </div>
            </section>

            <section className="content-block" style={{ borderBottom: "none" }}>
              <h2><span className="num">/ 07</span> 常见问题</h2>
              {DEFAULT_FAQ.map((item) => (
                <details key={item.q}>
                  <summary>{item.q}</summary>
                  <p>{item.a}</p>
                </details>
              ))}
            </section>
          </div>

          <aside>
            <div className="sticky-cta">
              <span className="sticky-cta__pill">★ 免费参与</span>
              <h3>2 分钟<br />完成预筛</h3>
              <p>提交后运营会在 24 小时内通过电话或微信联系你。</p>
              <ul className="sticky-cta__list">
                <li>免费研究用药与检查</li>
                <li>专人跟进，全程指导</li>
                <li>信息脱敏严格保密</li>
                <li>可随时申请退出</li>
              </ul>
              <Link href={`/prescreen/${trial.slug}`} className="btn btn--primary btn--lg">
                立即预筛 <span className="arrow">→</span>
              </Link>
            </div>

            <div className="side-block">
              <span className="eyebrow" style={{ marginBottom: 14 }}>不确定？先问问</span>
              <h4 style={{ marginTop: 14 }}>直接电话咨询</h4>
              <p className="muted" style={{ marginTop: 10, lineHeight: 1.6, fontSize: "var(--fs-sm)" }}>
                工作日 9:00–18:00，周末值班。不签署任何东西，只是聊一聊你的情况。
              </p>
              {trial.contactPhone ? (
                <a href={`tel:${trial.contactPhone}`} className="related-item" style={{ marginTop: 16 }}>
                  <strong>{trial.contactPhone}</strong>
                  <span className="muted">项目负责人 {trial.contactPerson ?? ""}</span>
                </a>
              ) : (
                <a href="tel:400-888-1688" className="related-item" style={{ marginTop: 16 }}>
                  <strong>400-888-1688</strong>
                  <span className="muted">患者咨询专线</span>
                </a>
              )}
              <Link href="/contact" className="related-item">
                <strong>填留言表单</strong>
                <span className="muted">24 小时内回电</span>
              </Link>
            </div>

            {communityGroup ? (
              <div className="side-block">
                <span className="eyebrow" style={{ marginBottom: 14 }}>★ 病友讨论</span>
                <h4 style={{ marginTop: 14 }}>和同病种病友交流</h4>
                <p className="muted" style={{ marginTop: 10, lineHeight: 1.6, fontSize: "var(--fs-sm)" }}>
                  看看其他参与过这个研究或相关研究的病友怎么说。
                </p>
                <Link href={`/community/${communityGroup.slug}`} className="related-item" style={{ marginTop: 14 }}>
                  <strong>→ 进入 {communityGroup.name} 社区</strong>
                </Link>
              </div>
            ) : null}

            {/* M8.1 T6 · 伦理批件号强制显示（空值回落 "—"，用户拍板决策 1） */}
            <div className="side-block">
              <span className="eyebrow" style={{ marginBottom: 14 }}>★ 合规信息</span>
              <p className="muted" style={{ fontSize: "var(--fs-sm)", marginTop: 10 }}>
                伦理批件号：{trial.ethicsApproval ?? "—"}
              </p>
              {trial.adVersion ? (
                <p className="muted" style={{ fontSize: "var(--fs-sm)" }}>
                  广告版本：{trial.adVersion}
                  {trial.adVersionDate
                    ? `（${new Date(trial.adVersionDate).toISOString().slice(0, 10)}）`
                    : ""}
                </p>
              ) : null}
            </div>

            {/* M8.1 · 游客配额残余提示 */}
            {guestRemaining !== null ? (
              <div className="side-block" style={{ background: "var(--accent-soft)", borderRadius: "var(--r-md)" }}>
                <span className="eyebrow" style={{ marginBottom: 10, color: "var(--accent-dark)" }}>★ 游客提示</span>
                {guestRemaining > 0 ? (
                  <p style={{ fontSize: "var(--fs-sm)", marginTop: 6, lineHeight: 1.65 }}>
                    你正在以游客身份浏览，还可以免费查看 <strong style={{ color: "var(--accent-dark)" }}>{guestRemaining}</strong> 条试验详情。
                    <br />
                    <Link href="/auth" style={{ color: "var(--accent-dark)", textDecoration: "underline" }}>注册账号</Link>
                    后可无限查看并获得个性化推荐。
                  </p>
                ) : (
                  <p style={{ fontSize: "var(--fs-sm)", marginTop: 6, lineHeight: 1.65 }}>
                    这是你作为游客的最后 1 条免费详情，<Link href="/auth" style={{ color: "var(--accent-dark)", textDecoration: "underline" }}>立即注册</Link>可继续查看其他试验。
                  </p>
                )}
              </div>
            ) : null}
          </aside>
        </div>
      </div>
    </SiteShell>
  );
}
