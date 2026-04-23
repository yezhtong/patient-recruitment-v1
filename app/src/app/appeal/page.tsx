import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { SiteShell } from "@/components/SiteShell";
import { getUserSession, isLoggedIn } from "@/lib/user-session";
import { getLatestLock } from "@/lib/lock-guard";
import { AppealForm } from "./AppealForm";
import "./styles.css";

export const metadata: Metadata = {
  title: "提交申诉 · 九泰临研",
  robots: "noindex,nofollow",
};

export default async function AppealPage() {
  const session = await getUserSession();
  if (!isLoggedIn(session)) {
    redirect("/auth?next=/appeal");
  }

  const lock = await getLatestLock(session.userId);
  if (!lock || lock.unlockedAt) {
    // 没有有效锁 → 没什么可申诉的，回主页
    redirect("/");
  }

  const alreadyAppealed = lock.appealStatus !== "none";

  return (
    <SiteShell>
      <div className="container">
        <section className="appeal-shell">
          <div className="appeal-wrap">
            <div className="appeal-head">
              <div className="appeal-head__eyebrow">Submit Appeal</div>
              <h1>说明你的情况</h1>
              <p>
                填写完毕后，运营会在 24 小时内（工作日）人工核实。我们建议你尽量说清楚"当时在做什么、为什么要查这么多试验"。
              </p>
            </div>

            {alreadyAppealed ? (
              <div className="appeal-pending-box" role="status">
                <strong>你已经提交过申诉</strong>
                <p style={{ marginTop: 10, marginBottom: 0 }}>
                  状态：<strong>
                    {lock.appealStatus === "pending"
                      ? "处理中"
                      : lock.appealStatus === "approved"
                        ? "已通过"
                        : "未通过"}
                  </strong>
                  。请在
                  {" "}
                  <Link href="/account-locked">封锁页</Link>
                  {" "}
                  查看处理结果，或拨打客服电话 400-888-1688。
                </p>
              </div>
            ) : (
              <AppealForm />
            )}
          </div>
        </section>
      </div>
    </SiteShell>
  );
}
