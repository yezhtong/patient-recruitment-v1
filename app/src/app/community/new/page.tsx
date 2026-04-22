import { redirect } from "next/navigation";
import { SiteShell } from "@/components/SiteShell";
import { prisma } from "@/lib/prisma";
import { getUserSession, isLoggedIn } from "@/lib/user-session";
import { ComposeForm } from "./ComposeForm";
import "../community.css";

export const metadata = {
  title: "发布新帖 · 九泰临研社区",
  robots: { index: false, follow: true },
};

export default async function ComposePostPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string }>;
}) {
  const session = await getUserSession();
  if (!isLoggedIn(session)) {
    redirect("/auth?next=/community/new");
  }

  const sp = await searchParams;
  const groups = await prisma.communityGroup.findMany({
    where: { isEnabled: true },
    orderBy: { sortOrder: "asc" },
  });

  const defaultGroup = sp.group ?? groups[0]?.slug ?? "";

  return (
    <SiteShell current="community">
      <main className="cm-shell">
        <div className="container" style={{ maxWidth: 840 }}>
          <div className="cm-breadcrumb">
            <a href="/community">← 返回社区</a>
          </div>
          <h1
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: "clamp(40px, 5vw, 56px)",
              fontWeight: 400,
              letterSpacing: "-0.02em",
              margin: "14px 0 28px",
            }}
          >
            发布新帖 <em style={{ color: "var(--accent)", fontStyle: "italic" }}>/ 分享经验</em>
          </h1>

          <div className="cm-compose-rules">
            <h2>★ 在发布之前，请确认</h2>
            <ul>
              <li>
                <span className="num">/ 01</span>
                <span>不要留任何联系方式（手机号、微信号、邮箱、QQ 群号）</span>
              </li>
              <li>
                <span className="num">/ 02</span>
                <span>不要推荐、售卖或代购药品、保健品、诊疗方案</span>
              </li>
              <li>
                <span className="num">/ 03</span>
                <span>不要承诺「包入组、代办入组、保证疗效」等内容</span>
              </li>
              <li>
                <span className="num">/ 04</span>
                <span>涉及个人隐私可以选择「匿名发布」</span>
              </li>
            </ul>
            <p
              style={{
                marginTop: 16,
                color: "rgba(253,250,243,0.7)",
                fontSize: 13,
              }}
            >
              违反以上内容会被自动拦截或转人工审核。敏感词库会持续更新。
            </p>
          </div>

          <ComposeForm groups={groups} defaultGroupSlug={defaultGroup} />
        </div>
      </main>
    </SiteShell>
  );
}
