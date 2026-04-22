import Link from "next/link";
import { SiteShell } from "@/components/SiteShell";
import { prisma } from "@/lib/prisma";
import { summarizeCategories } from "@/lib/trials-filter";
import "./styles.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default async function HomePage() {
  const [featured, allPublic] = await Promise.all([
    prisma.clinicalTrial.findMany({
      where: { isPublic: true, status: "recruiting" },
      orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
      take: 3,
    }),
    prisma.clinicalTrial.findMany({
      where: { isPublic: true },
      select: { disease: true },
    }),
  ]);
  const categoryCards = summarizeCategories(allPublic);

  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "MedicalOrganization",
    name: "九泰临研",
    legalName: "九泰药械",
    url: SITE_URL,
    description:
      "九泰临研患者招募平台，帮助患者找到合适的临床试验。专业团队主动联系、免费用药与检查、信息严格保密、随时可以退出。",
    medicalSpecialty: "ClinicalStudy",
    contactPoint: {
      "@type": "ContactPoint",
      telephone: "400-888-1688",
      contactType: "Patient Recruitment",
      availableLanguage: "Chinese",
    },
  };

  return (
    <SiteShell current="home">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
      />
      {/* HERO */}
      <section className="hero">
        <svg className="hero__deco" viewBox="0 0 1280 600" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <pattern id="dotgrid" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.2" fill="#cfdfd9" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dotgrid)" />
        </svg>

        <div className="container hero__grid">
          <div>
            <span className="eyebrow">给正在求医路上的你</span>
            <h1 style={{ marginTop: 18 }} className="text-balance no-wrap-break">
              也许有一种新治疗，<em>正在等你</em>
            </h1>
            <p className="hero__lead">
              确诊之后，你不必只能等。临床试验也许能让你更早用上新药，全程由专业医生陪同，研究用药与检查都免费。
            </p>
            <div className="hero__cta">
              <Link href="/trials" className="btn btn--ink btn--lg">
                看看适合我的项目 <span className="arrow">→</span>
              </Link>
              <Link href="/about" className="btn btn--text">
                什么是临床试验？
              </Link>
            </div>

            <div className="hero-promises">
              <div className="hero-promise">
                <div className="hero-promise__k"><em>免费</em></div>
                <div className="hero-promise__v">研究用药 + 相关检查</div>
              </div>
              <div className="hero-promise">
                <div className="hero-promise__k">
                  2 <small style={{ fontFamily: "var(--font-mono)", fontSize: 14, color: "var(--gray-500)" }}>min</small>
                </div>
                <div className="hero-promise__v">填完一份资料</div>
              </div>
              <div className="hero-promise">
                <div className="hero-promise__k">
                  24 <small style={{ fontFamily: "var(--font-mono)", fontSize: 14, color: "var(--gray-500)" }}>hrs</small>
                </div>
                <div className="hero-promise__v">专人主动联系</div>
              </div>
            </div>
          </div>

          <div style={{ position: "relative" }}>
            <div className="hero-pill" aria-live="polite" aria-atomic="true">
              <span className="hero-pill__num">23</span>
              <span className="hero-pill__lbl">位病友本周已开始预筛</span>
            </div>

            <figure className="hero-photo">
              <img
                src="https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=900&h=1100&fit=crop&auto=format&q=80"
                alt="医生与患者温暖交流的场景"
                loading="eager"
                width={900}
                height={1100}
              />
              <div className="hero-photo__overlay">
                <div className="hero-photo__overlay-label">真实研究中心</div>
                <div className="hero-photo__overlay-text">北京协和医院 · 乳腺肿瘤门诊</div>
              </div>
            </figure>
          </div>
        </div>
      </section>

      {/* 患者顾虑 */}
      <section className="section">
        <div className="container">
          <div className="section-head">
            <div className="section-head__row">
              <div>
                <span className="eyebrow">你想问的，我们都想到了</span>
                <h2 style={{ marginTop: 16 }} className="no-wrap-break">那些让你犹豫的事</h2>
              </div>
              <p className="section-head__sub">报名一个临床试验，你心里多少会有顾虑。这是我们最常被问到的几件事。</p>
            </div>
          </div>

          <div className="grid grid--3">
            <div className="card">
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: ".12em", color: "var(--accent)", marginBottom: 24 }}>Q 01</div>
              <h3 style={{ fontFamily: "var(--font-serif)", fontSize: 26, fontWeight: 400, marginBottom: 14, lineHeight: 1.25 }} className="text-balance">我会不会被当成小白鼠？</h3>
              <p className="muted" style={{ lineHeight: 1.7 }}>不会。所有项目都通过国家药监局审批和医院伦理委员会监督，研究中心会全程监测你的健康指标，发现任何风险都会立即处理。</p>
            </div>
            <div className="card">
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: ".12em", color: "var(--accent)", marginBottom: 24 }}>Q 02</div>
              <h3 style={{ fontFamily: "var(--font-serif)", fontSize: 26, fontWeight: 400, marginBottom: 14, lineHeight: 1.25 }} className="text-balance">会不会要花很多钱？</h3>
              <p className="muted" style={{ lineHeight: 1.7 }}>
                不会。研究用药和研究相关的检查都是<strong style={{ color: "var(--ink-900)" }}>免费</strong>的，部分项目还会给你补贴交通费。
              </p>
            </div>
            <div className="card" style={{ position: "relative", overflow: "hidden" }}>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: ".12em", color: "var(--accent)", marginBottom: 24 }}>Q 03</div>
              <h3 style={{ fontFamily: "var(--font-serif)", fontSize: 26, fontWeight: 400, marginBottom: 14, lineHeight: 1.25 }} className="text-balance">
                如果我后悔了，<em style={{ fontStyle: "italic" }}>还能退出吗？</em>
              </h3>
              <p className="muted" style={{ lineHeight: 1.7 }}>任何时候都可以。退出不会影响你后续在这家医院的就医，更不会被追究任何责任。这是你的合法权利。</p>
              <svg style={{ position: "absolute", right: -30, bottom: -30, width: 160, height: 160, opacity: 0.15 }} viewBox="0 0 100 100" aria-hidden="true">
                <circle cx="50" cy="50" r="48" fill="none" stroke="var(--lime)" strokeWidth="1" />
                <circle cx="50" cy="50" r="36" fill="none" stroke="var(--lime)" strokeWidth="1" />
                <circle cx="50" cy="50" r="24" fill="none" stroke="var(--lime)" strokeWidth="1" />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* 病种入口 */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="section-head">
            <div className="section-head__row">
              <div>
                <span className="eyebrow">找到属于你的方向</span>
                <h2 style={{ marginTop: 16 }} className="no-wrap-break">你最关心的是哪一种？</h2>
              </div>
              <Link href="/trials" className="btn btn--text">看看更多病种 →</Link>
            </div>
          </div>

          <div className="disease-grid">
            {categoryCards.map((cat, i) => (
              <Link key={cat.id} href={`/trials?dc=${cat.id}`} className="disease-chip">
                <span className="disease-chip__num">/ {String(i + 1).padStart(2, "0")}</span>
                <span className="disease-chip__label">{cat.label}</span>
                <span className="disease-chip__count">
                  <span>{cat.count} 个项目在招</span>
                  <span className="arrow">→</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 试验推荐 */}
      <section className="section" style={{ background: "var(--cream-100)" }}>
        <div className="container">
          <div className="section-head">
            <div className="section-head__row">
              <div>
                <span className="eyebrow">也许这些适合你</span>
                <h2 style={{ marginTop: 16 }} className="no-wrap-break">最近<em>正在招募</em>的项目</h2>
              </div>
              <Link href="/trials" className="btn btn--ghost">看更多项目 →</Link>
            </div>
          </div>

          <div className="grid grid--3">
            {featured.length === 0 ? (
              <p className="muted">暂无公开招募中的试验。</p>
            ) : (
              featured.map((t) => (
                <article key={t.id} className="trial-card">
                  <div className="trial-card__head">
                    <div className="trial-card__tags">
                      <span className="tag">{t.disease}</span>
                      {t.phase ? <span className="tag">{t.phase} 期</span> : null}
                    </div>
                    <span className="badge badge--success">招募中</span>
                  </div>
                  <h3 className="trial-card__title">
                    <Link href={`/trials/${t.slug}`}>{t.title}</Link>
                  </h3>
                  <p className="trial-card__sum">{t.summary}</p>
                  <div className="trial-card__meta">
                    <span>
                      <svg className="icon icon--sm" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M12 22s-7-7.5-7-12a7 7 0 0 1 14 0c0 4.5-7 12-7 12z" />
                        <circle cx="12" cy="10" r="2.5" />
                      </svg>{" "}
                      {t.city}
                    </span>
                    <span>
                      <svg className="icon icon--sm" viewBox="0 0 24 24" aria-hidden="true">
                        <circle cx="12" cy="12" r="9" />
                        <path d="M12 7v5l3 2" />
                      </svg>{" "}
                      2 MIN
                    </span>
                  </div>
                  <div className="trial-card__cta">
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--accent)", letterSpacing: ".04em" }}>
                      {t.isFeatured ? "重点推荐项目" : "本周招募中"}
                    </span>
                    <Link href={`/trials/${t.slug}`} className="btn btn--text">看看详情 →</Link>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      </section>

      {/* 流程 */}
      <section className="section" id="how">
        <div className="container">
          <div className="section-head">
            <div className="section-head__row">
              <div>
                <span className="eyebrow">接下来会发生什么</span>
                <h2 style={{ marginTop: 16 }} className="no-wrap-break">从填资料到<em>有人联系你</em></h2>
              </div>
              <p className="section-head__sub">不会让你来回填表、反复跑腿。整个过程我们都会主动告诉你下一步。</p>
            </div>
          </div>

          <div className="steps">
            {[
              { num: "01", title: "你在网上填一份资料", desc: "选一个项目，回答几个简单的问题。已登录用户基础资料会自动带入，大概 2 分钟。", img: "https://images.unsplash.com/photo-1580281657527-47f249e8f4df?w=600&h=450&fit=crop&auto=format&q=80", alt: "在手机上填写资料" },
              { num: "02", title: "我们的同事会联系你", desc: "24 小时内会有专人通过电话或微信联系你，和你确认情况，回答你的疑问。", img: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600&h=450&fit=crop&auto=format&q=80", alt: "专人主动联系沟通" },
              { num: "03", title: "你去医院见医生", desc: "合适的话，我们会帮你预约离你最近的研究中心。医生会做更详细的评估。", img: "https://images.unsplash.com/photo-1666214280557-f1b5022eb634?w=600&h=450&fit=crop&auto=format&q=80", alt: "医生门诊评估" },
            ].map((s) => (
              <div key={s.num} className="step">
                <div style={{ aspectRatio: "4/3", borderRadius: "var(--r-lg)", overflow: "hidden", marginBottom: 20, background: "var(--gray-100)" }}>
                  <img src={s.img} alt={s.alt} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
                <div className="step__num">{s.num}</div>
                <h4>{s.title}</h4>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 真实病友故事 */}
      <section className="numbers">
        <div className="container">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", flexWrap: "wrap", gap: 24, marginBottom: 56 }}>
            <div>
              <span className="eyebrow eyebrow--light">真实病友的故事</span>
              <h2 style={{ color: "var(--cream-50)", marginTop: 14 }} className="no-wrap-break">
                他们和你<em style={{ color: "var(--lime)" }}>一样曾经犹豫</em>
              </h2>
            </div>
            <p style={{ color: "rgba(253,250,243,.7)", maxWidth: "36ch", fontSize: "var(--fs-lg)", lineHeight: 1.5 }}>这些都是匿名的真实分享。点开看看他们的故事。</p>
          </div>
        </div>

        <div className="container container--wide" style={{ padding: 0 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 1, background: "rgba(255,255,255,.08)", borderTop: "1px solid rgba(255,255,255,.08)", borderBottom: "1px solid rgba(255,255,255,.08)" }}>
            {[
              { img: "https://i.pravatar.cc/150?img=47", name: "张女士 · 42 岁", meta: "乳腺癌 · 上海", quote: `"我以为'临床试验'就是当小白鼠，后来发现完全不是这样。"` },
              { img: "https://i.pravatar.cc/150?img=60", name: "李先生 · 56 岁", meta: "2 型糖尿病 · 北京", quote: `"医生主动给我打电话，把每一步都讲得很清楚，没有催我。"` },
              { img: "https://i.pravatar.cc/150?img=44", name: "王女士 · 35 岁", meta: "医美 / 法令纹 · 杭州", quote: `"全程没花过一分钱，效果出乎我的预期。后来推荐了我妈妈也来。"` },
            ].map((s) => (
              <div key={s.name} className="story-card">
                <div className="story-card__head">
                  <div className="avatar avatar--lg">
                    <img src={s.img} alt={`${s.name}头像`} />
                  </div>
                  <div className="story-card__who">
                    <span className="story-card__name">{s.name}</span>
                    <span className="story-card__meta">{s.meta}</span>
                  </div>
                </div>
                <p className="story-card__quote">{s.quote}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 安全保障 */}
      <section className="section">
        <div className="container">
          <div className="section-head">
            <div className="section-head__row">
              <div>
                <span className="eyebrow">你为什么可以放心</span>
                <h2 style={{ marginTop: 16 }} className="no-wrap-break">这些事，我们替你<em>守住了</em></h2>
              </div>
              <p className="section-head__sub">把你能想到的、想不到的都做好，是我们最基本的工作。</p>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 0, borderTop: "var(--border-strong)", borderLeft: "var(--border-strong)" }}>
            {[
              { tag: "/ 01 合规", title: "国家药监局审批 + 医院伦理委员会监督", desc: "所有上线项目都经过国家药品监督管理局批准，并通过研究医院伦理委员会的独立审查。" },
              { tag: "/ 02 隐私", title: "个人信息严格脱敏与加密", desc: "你的手机号、姓名、病历不会出现在任何公开页面。仅授权的运营人员与医生可见。" },
              { tag: "/ 03 退出权", title: "任何阶段都可以申请退出", desc: "从填资料到入组之后，你随时可以叫停。退出不会影响你以后在这家医院的就医。" },
              { tag: "/ 04 全程陪伴", title: "研究中心团队全程监测你的健康", desc: "入组后，研究中心的医生护士会定期评估你的身体反应。任何不适都有专人对接。" },
            ].map((b) => (
              <div key={b.tag} style={{ padding: 36, borderRight: "var(--border-strong)", borderBottom: "var(--border-strong)" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, letterSpacing: ".1em", color: "var(--accent)", fontWeight: 500 }}>{b.tag}</span>
                <h4 style={{ fontFamily: "var(--font-serif)", fontSize: 28, fontWeight: 400, margin: "14px 0", letterSpacing: "-.01em" }}>{b.title}</h4>
                <p className="muted" style={{ lineHeight: 1.7 }}>{b.desc}</p>
              </div>
            ))}
          </div>

          <div style={{ textAlign: "center", marginTop: 48 }}>
            <Link href="/about" className="btn btn--ghost">了解更多关于我们的保障 →</Link>
          </div>
        </div>
      </section>

      {/* FAQ + 联系 */}
      <section className="section" style={{ background: "var(--cream-100)" }}>
        <div className="container">
          <div className="grid grid--2" style={{ gap: 48 }}>
            <div>
              <span className="eyebrow">你可能还想知道</span>
              <h2 style={{ marginTop: 16 }} className="no-wrap-break">关于临床试验，<em>常见问题</em></h2>

              <div className="faq-list" style={{ margin: "32px 0 0", borderTop: "1px solid var(--ink-900)", borderBottom: "1px solid var(--ink-900)" }}>
                <details className="q">
                  <summary>参加临床试验，到底安全吗？</summary>
                  <div className="answer">所有临床试验必须经国家药品监督管理局批准，并由研究医院的伦理委员会独立审查后才能招募。试验期间，研究中心会定期监测你的健康指标，任何异常都会立即处理。整个流程受 GCP（药物临床试验质量管理规范）严格约束。</div>
                </details>
                <details className="q">
                  <summary>参加试验需要花钱吗？</summary>
                  <div className="answer">
                    研究用药和研究相关的检查都是<strong style={{ color: "var(--ink-900)" }}>免费</strong>的，部分项目还会补贴你的交通费或提供误工补偿。试验过程中你不会为方案要求的任何检查、药物、随访支付费用。
                  </div>
                </details>
                <details className="q">
                  <summary>我报名后多久会有人联系我？</summary>
                  <div className="answer">通常在 24 小时内，运营同事会通过电话或微信主动联系你，核对信息并回答你的疑问。工作日（9:00–18:00）内基本可以当天联系到，周末会在下一个工作日上午优先处理。</div>
                </details>
                <details className="q" style={{ borderBottom: "none" }}>
                  <summary>如果中途想退出，会有麻烦吗？</summary>
                  <div className="answer">不会。从填资料到正式入组之后，你都可以在任何阶段申请退出，不需要解释理由。退出后你在这家医院的后续就医不会受到任何影响，这是法律赋予你的合法权利。</div>
                </details>
              </div>
              <Link href="/about" className="btn btn--text mt-6">看完整答疑 →</Link>
            </div>

            <div style={{ background: "var(--ink-900)", color: "var(--cream-50)", padding: 48, borderRadius: "var(--r-2xl)", position: "relative", overflow: "hidden" }}>
              <span className="eyebrow eyebrow--light">还想多聊几句？</span>
              <h2 style={{ color: "var(--cream-50)", marginTop: 16 }} className="no-wrap-break">
                直接跟我们<em style={{ color: "var(--lime)" }}>打个电话</em>
              </h2>
              <p style={{ color: "rgba(253,250,243,.75)", marginTop: 24, lineHeight: 1.7, fontSize: "var(--fs-lg)", maxWidth: "38ch" }}>
                不知道自己合不合适？不确定这个项目怎么参加？专人接听，工作日 9:00–18:00，周末有值班。
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 14, margin: "32px 0" }}>
                <div style={{ padding: "20px 22px", background: "rgba(253,250,243,.05)", border: "1px solid rgba(253,250,243,.1)", borderRadius: 14 }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", color: "rgba(253,250,243,.6)", marginBottom: 6 }}>患者咨询专线</div>
                  <div style={{ fontFamily: "var(--font-serif)", fontSize: 30, color: "var(--lime)", letterSpacing: 0 }}>400-888-1688</div>
                </div>
                <div style={{ padding: "20px 22px", background: "rgba(253,250,243,.05)", border: "1px solid rgba(253,250,243,.1)", borderRadius: 14 }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", color: "rgba(253,250,243,.6)", marginBottom: 6 }}>微信咨询（扫码添加）</div>
                  <div style={{ fontFamily: "var(--font-sans)", fontSize: 17, color: "var(--cream-50)" }}>官方顾问 · 回复 24h 内</div>
                </div>
              </div>

              <Link href="/contact" className="btn btn--primary">
                填留言，等回电 <span className="arrow">→</span>
              </Link>

              <div style={{ position: "absolute", right: -60, top: -60, width: 200, height: 200, borderRadius: "50%", background: "linear-gradient(135deg, var(--accent) 0%, transparent 70%)", opacity: 0.4 }} />
            </div>
          </div>
        </div>
      </section>

      {/* 最终 CTA */}
      <section style={{ background: "var(--accent)", padding: "120px 0", position: "relative", overflow: "hidden" }}>
        <svg style={{ position: "absolute", right: -100, bottom: -100, width: 500, opacity: 0.15 }} viewBox="0 0 100 100" aria-hidden="true">
          <circle cx="50" cy="50" r="48" fill="none" stroke="var(--ink-900)" strokeWidth=".5" />
          <circle cx="50" cy="50" r="36" fill="none" stroke="var(--ink-900)" strokeWidth=".5" />
          <circle cx="50" cy="50" r="24" fill="none" stroke="var(--ink-900)" strokeWidth=".5" />
          <circle cx="50" cy="50" r="12" fill="var(--ink-900)" />
        </svg>
        <div className="container">
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 48, alignItems: "center" }}>
            <div>
              <span className="eyebrow" style={{ color: "var(--ink-900)" }}>给自己一个机会</span>
              <h2 style={{ color: "var(--ink-900)", marginTop: 16 }} className="text-balance">
                现在就花{" "}
                <em style={{ fontStyle: "italic", color: "var(--ink-900)", textDecoration: "underline", textDecorationThickness: 3, textUnderlineOffset: 8 }}>2 分钟</em>
                ，看看适合你的项目
              </h2>
            </div>
            <div>
              <p style={{ color: "var(--ink-900)", fontSize: "var(--fs-lg)", lineHeight: 1.6, marginBottom: 32 }}>
                填完后，专人会在 24 小时内主动联系你。中途随时可退出，不影响你后续就医。
              </p>
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                <Link href="/trials" className="btn btn--ink btn--lg">
                  看看适合我的项目 <span className="arrow">→</span>
                </Link>
                <Link href="/contact" className="btn btn--ghost btn--lg">先问问看</Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
