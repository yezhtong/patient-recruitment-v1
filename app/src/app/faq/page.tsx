import Link from "next/link";
import type { Metadata } from "next";
import { SiteShell } from "@/components/SiteShell";
import { prisma } from "@/lib/prisma";
import "./styles.css";

export const metadata: Metadata = {
  title: "常见问题 · 九泰临研",
  description:
    "关于参加临床试验的 20 条核心问题解答：什么是临床试验、安全性、费用、隐私保护、知情同意、随时退出、入组流程等。",
  openGraph: {
    title: "常见问题 · 九泰临研",
    description:
      "临床试验患者招募平台的高频问题解答：安全、费用、隐私、退出权、入组流程。",
    url: "/faq",
    type: "website",
  },
};

const CATEGORY_LABEL: Record<string, string> = {
  general: "基础问题",
  safety: "安全与风险",
  costs: "费用与医保",
  privacy: "隐私保护",
  "trial-process": "试验流程",
  enrollment: "报名与入组",
  withdraw: "退出与权利",
};

const CATEGORY_ORDER = [
  "general",
  "safety",
  "costs",
  "privacy",
  "trial-process",
  "enrollment",
  "withdraw",
];

export default async function FaqPage() {
  const all = await prisma.faqArticle.findMany({
    where: { isPublished: true },
    orderBy: [{ category: "asc" }, { order: "asc" }],
  });

  const byCategory = new Map<string, typeof all>();
  for (const f of all) {
    const list = byCategory.get(f.category) ?? [];
    list.push(f);
    byCategory.set(f.category, list);
  }

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: all.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.answer,
      },
    })),
  };

  return (
    <SiteShell current="about">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <div className="container" style={{ padding: "48px 0 96px" }}>
        <div style={{ marginBottom: 40 }}>
          <span className="eyebrow">★ 常见问题</span>
          <h1
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "clamp(48px, 6vw, 72px)",
              fontWeight: 400,
              letterSpacing: "-.02em",
              lineHeight: 1.05,
              margin: "14px 0 14px",
            }}
          >
            常见 <em style={{ color: "var(--accent)", fontStyle: "italic" }}>疑问</em>
          </h1>
          <p className="muted" style={{ fontSize: "var(--fs-lg)", maxWidth: "60ch" }}>
            我们把患者在报名前最常问的 {all.length} 个问题整理在这里。读完大部分就能心里有数，剩下的欢迎直接联系运营。
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "240px 1fr",
            gap: 40,
            alignItems: "start",
          }}
        >
          <aside style={{ position: "sticky", top: 100 }}>
            <nav aria-label="分类跳转" className="faq-cat-nav">
              {CATEGORY_ORDER.filter((c) => byCategory.has(c)).map((c) => (
                <a
                  key={c}
                  href={`#cat-${c}`}
                  className="faq-cat-nav__link"
                >
                  <span>{CATEGORY_LABEL[c] ?? c}</span>
                  <span className="faq-cat-nav__count">
                    {byCategory.get(c)?.length ?? 0}
                  </span>
                </a>
              ))}
            </nav>
            <div
              style={{
                marginTop: 24,
                padding: 18,
                background: "var(--cream-100)",
                border: "var(--border)",
                borderRadius: "var(--r-xl)",
                fontSize: 13,
                color: "var(--gray-600)",
                lineHeight: 1.6,
              }}
            >
              还有问题？
              <br />
              <Link href="/contact" style={{ color: "var(--ink-900)", fontWeight: 500 }}>
                → 填留言表单
              </Link>
              <br />
              <a href="tel:400-888-1688" style={{ color: "var(--ink-900)", fontWeight: 500 }}>
                → 400-888-1688
              </a>
            </div>
          </aside>

          <main>
            {CATEGORY_ORDER.filter((c) => byCategory.has(c)).map((c) => (
              <section key={c} id={`cat-${c}`} style={{ marginBottom: 48 }}>
                <h2
                  style={{
                    fontFamily: "var(--font-serif)",
                    fontSize: 36,
                    fontWeight: 400,
                    letterSpacing: "-.01em",
                    marginBottom: 20,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 13,
                      color: "var(--accent)",
                      letterSpacing: ".12em",
                      marginRight: 12,
                    }}
                  >
                    /
                  </span>
                  {CATEGORY_LABEL[c] ?? c}
                </h2>

                <div
                  style={{
                    background: "var(--cream-0)",
                    border: "var(--border)",
                    borderRadius: "var(--r-xl)",
                    overflow: "hidden",
                  }}
                >
                  {byCategory.get(c)!.map((f, idx) => (
                    <details
                      key={f.id}
                      style={{
                        padding: "20px 24px",
                        borderBottom:
                          idx < (byCategory.get(c)!.length - 1)
                            ? "1px solid var(--ink-100)"
                            : "none",
                      }}
                    >
                      <summary
                        style={{
                          fontSize: 17,
                          fontWeight: 500,
                          cursor: "pointer",
                          color: "var(--ink-900)",
                          listStyle: "none",
                        }}
                      >
                        {f.question}
                      </summary>
                      <p
                        style={{
                          marginTop: 12,
                          color: "var(--gray-700)",
                          lineHeight: 1.8,
                          fontSize: 15,
                        }}
                      >
                        {f.answer}
                      </p>
                    </details>
                  ))}
                </div>
              </section>
            ))}
          </main>
        </div>
      </div>
    </SiteShell>
  );
}
