import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { SiteShell } from "@/components/SiteShell";
import { getUserSession, isLoggedIn } from "@/lib/user-session";
import { getLatestLock } from "@/lib/lock-guard";
import "../styles.css";

export const metadata: Metadata = {
  title: "申诉已提交 · 九泰临研",
  robots: "noindex,nofollow",
};

export default async function AppealSubmittedPage() {
  const session = await getUserSession();
  if (!isLoggedIn(session)) {
    redirect("/auth");
  }

  const lock = await getLatestLock(session.userId);
  if (!lock) {
    redirect("/");
  }

  return (
    <SiteShell>
      <div className="container">
        <section className="appeal-shell">
          <div className="appeal-wrap">
            <div className="appeal-success">
              <div className="appeal-success__icon" aria-hidden="true">✓</div>
              <h2>申诉已提交</h2>
              <p>
                我们已收到你的申诉，工单号 <code>LCK-{lock.id.slice(0, 8).toUpperCase()}</code>。
              </p>
              <p>
                运营会在 <strong>24 小时内</strong>（工作日）人工核实，处理结果会在你登录时直接展示。
              </p>
              <p style={{ color: "var(--gray-500)", fontSize: "var(--fs-sm)" }}>
                在处理期间，你可以继续浏览常见问题或拨打客服电话。
              </p>
              <div className="appeal-success__cta">
                <Link href="/faq" className="btn btn--ghost">查看常见问题</Link>
                <a href="tel:400-888-1688" className="btn btn--primary">📞 拨打客服</a>
              </div>
            </div>
          </div>
        </section>
      </div>
    </SiteShell>
  );
}
