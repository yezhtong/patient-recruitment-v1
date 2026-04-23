import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { SiteShell } from "@/components/SiteShell";
import { getUserSession, isLoggedIn } from "@/lib/user-session";
import { getLatestLock } from "@/lib/lock-guard";
import "./styles.css";

export const metadata: Metadata = {
  title: "账号已被暂停使用 · 九泰临研",
  robots: "noindex,nofollow",
};

function fmtDateTime(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day} ${hh}:${mm}`;
}

/**
 * M8.1 · 账号封锁页
 * 视觉原型：原型_V1/m8增量/account-lock.html
 *
 * 已申诉时展示申诉状态；被驳回时依旧显示原 CTA（但文案调整）。
 * 文案严守 PRD §7.4 禁用词表（不出现"爬虫/违规/作弊"等指责性用词）。
 */
export default async function AccountLockedPage() {
  const session = await getUserSession();
  if (!isLoggedIn(session)) {
    redirect("/auth?next=/account-locked");
  }

  const lock = await getLatestLock(session.userId);
  if (!lock) {
    // 没有锁记录（或已解锁）→ 回主页
    redirect("/");
  }

  const isCurrentlyLocked = !lock.unlockedAt;
  const hasAppeal = lock.appealStatus !== "none";
  const appealStatusLabel =
    lock.appealStatus === "pending"
      ? "申诉处理中"
      : lock.appealStatus === "approved"
        ? "申诉已通过"
        : lock.appealStatus === "rejected"
          ? "申诉未通过"
          : "";

  return (
    <SiteShell>
      <div className="container">
        <section className="lock-shell" aria-labelledby="lock-title">
          <div className="lock-card">
            <div className="lock-card__top">
              <div className="lock-card__icon" aria-hidden="true">⏸</div>
              <div className="lock-card__eyebrow">Account Paused</div>
              <h1 className="lock-card__title" id="lock-title">
                {isCurrentlyLocked ? "你的账号被暂停使用了" : "账号已恢复访问"}
              </h1>
            </div>

            <div className="lock-card__body">
              <div className="lock-reason-box">
                <strong>暂停原因</strong>
                <p>{lock.reason}</p>
              </div>

              <div className="lock-meta-grid">
                <div className="lock-meta-item">
                  <strong>暂停时间</strong>
                  <span>{fmtDateTime(lock.lockedAt)}</span>
                </div>
                <div className="lock-meta-item">
                  <strong>工单号</strong>
                  <span>LCK-{lock.id.slice(0, 8).toUpperCase()}</span>
                </div>
              </div>

              {hasAppeal ? (
                <div style={{ marginBottom: 24 }}>
                  <span
                    className={`lock-status-pill --${lock.appealStatus}`}
                    aria-live="polite"
                  >
                    {lock.appealStatus === "pending" ? "⏳" : lock.appealStatus === "approved" ? "✓" : "⊘"}
                    {" "}
                    {appealStatusLabel}
                  </span>
                  {lock.appealReplyText ? (
                    <p
                      style={{
                        marginTop: 12,
                        padding: "14px 18px",
                        background: "var(--gray-50)",
                        borderRadius: "var(--r-md)",
                        fontSize: "var(--fs-sm)",
                        lineHeight: 1.7,
                        color: "var(--gray-700)",
                      }}
                    >
                      <strong style={{ color: "var(--ink-900)" }}>运营回复：</strong>
                      {lock.appealReplyText}
                    </p>
                  ) : lock.appealStatus === "pending" ? (
                    <p style={{ marginTop: 12, color: "var(--gray-600)", fontSize: "var(--fs-sm)", lineHeight: 1.65 }}>
                      你的申诉已于 {lock.appealedAt ? fmtDateTime(lock.appealedAt) : "—"} 提交。我们会在 24 小时内（工作日）给你答复。
                    </p>
                  ) : null}
                </div>
              ) : null}

              {isCurrentlyLocked && !hasAppeal ? (
                <p className="lock-intro">
                  如果你是正常浏览被误伤，请点下方按钮说明情况。运营会在 <strong>24 小时内</strong>（工作日）人工核实并回复你。
                </p>
              ) : null}

              <div className="lock-actions">
                {isCurrentlyLocked && !hasAppeal ? (
                  <Link href="/appeal" className="btn btn--primary btn--lg">
                    我要申诉 →
                  </Link>
                ) : null}
                <a href="tel:400-888-1688" className="btn btn--ghost btn--lg">
                  📞 拨打客服电话 400-888-1688
                </a>
              </div>

              <div className="lock-help-hint">
                <strong>贴心提示：</strong>
                暂停期间你仍可以<Link href="/faq">查看常见问题</Link>、<Link href="/contact">联系客服</Link>。
                处理完成前，其他需要登录的页面暂时不可访问。
              </div>
            </div>
          </div>
        </section>
      </div>
    </SiteShell>
  );
}
