import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession, isAdminSession } from "@/lib/admin-session";
import { adminLogout } from "@/lib/actions/admin-auth";
import { prisma } from "@/lib/prisma";

export default async function AdminAuthedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getAdminSession();
  if (!isAdminSession(session)) {
    redirect("/admin/login");
  }

  const [
    submittedLeadCount,
    trialCount,
    pendingPostCount,
    faqCount,
    groupCount,
    swCount,
    pendingAppealCount,
    mediaCount,
  ] = await Promise.all([
    prisma.lead.count({ where: { status: "submitted" } }),
    prisma.clinicalTrial.count(),
    prisma.communityPost.count({ where: { reviewStatus: "pending" } }),
    prisma.faqArticle.count(),
    prisma.communityGroup.count(),
    prisma.sensitiveWord.count({ where: { isEnabled: true } }),
    // M8.1 · 待处理申诉数
    prisma.accountLock.count({
      where: { appealStatus: "pending", unlockedAt: null },
    }),
    // M8.1 · 素材库条数
    prisma.mediaAsset.count({ where: { isEnabled: true } }),
  ]);

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Link href="/admin" className="admin-sidebar__brand">
          <span className="dot">JT</span>
          <span>
            九泰临研
            <small>运营后台</small>
          </span>
        </Link>
        <nav className="admin-nav" aria-label="主导航">
          <Link href="/admin">工作台</Link>
          <Link href="/admin/trials">
            <span>试验管理</span>
            <span className="count">{trialCount}</span>
          </Link>
          <Link href="/admin/recruits">
            <span>招募管理</span>
            {submittedLeadCount > 0 ? (
              <span className="count">{submittedLeadCount} 待跟进</span>
            ) : null}
          </Link>
          <Link href="/admin/locks">
            <span>封锁管理</span>
            {pendingAppealCount > 0 ? (
              <span className="count">{pendingAppealCount} 待处理</span>
            ) : null}
          </Link>
          <Link href="/admin/media">
            <span>图片素材</span>
            <span className="count">{mediaCount}</span>
          </Link>
          <Link href="/admin/community/posts">
            <span>社区审核</span>
            {pendingPostCount > 0 ? (
              <span className="count">{pendingPostCount} 待审</span>
            ) : null}
          </Link>
          <Link href="/admin/community/groups">
            <span>社区分区</span>
            <span className="count">{groupCount}</span>
          </Link>
          <Link href="/admin/community/sensitive-words">
            <span>敏感词库</span>
            <span className="count">{swCount}</span>
          </Link>
          <Link href="/admin/community/sensitive-hits">
            <span>风险命中</span>
          </Link>
          <Link href="/admin/faq">
            <span>FAQ 管理</span>
            <span className="count">{faqCount}</span>
          </Link>
          {session.role === "admin" ? (
            <Link href="/admin/users">
              <span>用户管理</span>
            </Link>
          ) : null}
          {session.role === "admin" ? (
            <Link href="/admin/ai-account">
              <span>AI 账号</span>
            </Link>
          ) : null}
          {session.role === "admin" ? (
            <Link href="/admin/llm-logs">
              <span>LLM 日志</span>
            </Link>
          ) : null}
          {session.role === "admin" ? (
            <Link href="/admin/audit-logs">
              <span>审计日志</span>
            </Link>
          ) : null}
        </nav>
        <div className="admin-sidebar__user">
          <strong>{session.displayName}</strong>
          @{session.username} · {session.role === "admin" ? "管理员" : "运营"}
          <form action={adminLogout}>
            <button type="submit" className="logout-btn">退出登录</button>
          </form>
        </div>
      </aside>
      <main className="admin-main">{children}</main>
    </div>
  );
}
