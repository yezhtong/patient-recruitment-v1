import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { LockActionPanel } from "./LockActionPanel";

export const metadata: Metadata = {
  title: "封锁详情 · 九泰临研后台",
};

function fmt(d: Date): string {
  return d.toLocaleString("zh-CN", { hour12: false });
}

function maskPhone(phone: string): string {
  if (!phone || phone.length < 7) return phone;
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
}

export default async function LockDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lock = await prisma.accountLock.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          phone: true,
          displayName: true,
          createdAt: true,
          lastLoginAt: true,
          _count: { select: { applications: true, posts: true } },
        },
      },
    },
  });
  if (!lock) return notFound();

  // 近 30 min 去重行为日志（按 trial 聚合）
  const since = new Date(lock.lockedAt.getTime() - 30 * 60 * 1000);
  const logs = await prisma.userBehaviorLog.findMany({
    where: {
      userId: lock.userId,
      action: "trial_detail_view",
      createdAt: { gte: since, lte: lock.lockedAt },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const trialIds = Array.from(
    new Set(logs.map((l) => l.targetId).filter(Boolean) as string[]),
  );
  const trials = trialIds.length
    ? await prisma.clinicalTrial.findMany({
        where: { id: { in: trialIds } },
        select: { id: true, title: true, slug: true },
      })
    : [];
  const trialById = new Map(trials.map((t) => [t.id, t]));

  const alreadyUnlocked = Boolean(lock.unlockedAt);

  return (
    <div className="page-head">
      <div style={{ marginBottom: 20 }}>
        <Link
          href="/admin/locks"
          style={{ color: "var(--gray-600)", fontSize: "var(--fs-sm)", textDecoration: "none" }}
        >
          ← 返回封锁列表
        </Link>
      </div>
      <div>
        <span className="eyebrow">LCK-{lock.id.slice(0, 8).toUpperCase()}</span>
        <h2 style={{ marginTop: 10 }}>
          {lock.user.displayName ?? "未命名"} · {maskPhone(lock.user.phone)}
        </h2>
        <p className="page-head__sub">
          封锁时间：{fmt(lock.lockedAt)}
          {lock.unlockedAt ? ` · 已于 ${fmt(lock.unlockedAt)} 解锁` : ""}
        </p>
      </div>

      <section style={{ marginTop: 28 }}>
        <h3 style={{ fontFamily: "var(--font-serif)", fontWeight: 400, fontSize: 22, marginBottom: 14, paddingBottom: 8, borderBottom: "1px dashed var(--ink-200)" }}>
          基本信息
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          <KV label="注册时间" value={fmt(lock.user.createdAt)} />
          <KV label="最近登录" value={lock.user.lastLoginAt ? fmt(lock.user.lastLoginAt) : "—"} />
          <KV label="累计报名" value={`${lock.user._count.applications} 次`} />
          <KV label="累计发帖" value={`${lock.user._count.posts} 篇`} />
          <KV label="封锁原因" value={lock.reason} wide />
          <KV label="触发规则" value={lock.triggeredBy ?? "—"} />
        </div>
      </section>

      <section style={{ marginTop: 28 }}>
        <h3 style={{ fontFamily: "var(--font-serif)", fontWeight: 400, fontSize: 22, marginBottom: 14, paddingBottom: 8, borderBottom: "1px dashed var(--ink-200)" }}>
          触发前 30 分钟行为日志
        </h3>
        {logs.length === 0 ? (
          <p style={{ color: "var(--gray-500)", fontSize: "var(--fs-sm)" }}>无行为日志。</p>
        ) : (
          <div style={{ display: "grid", gap: 6 }}>
            {logs.map((log) => {
              const trial = log.targetId ? trialById.get(log.targetId) : null;
              return (
                <div
                  key={log.id}
                  style={{
                    display: "flex",
                    gap: 12,
                    padding: "8px 12px",
                    background: "var(--cream-50)",
                    borderRadius: "var(--r-sm)",
                    borderLeft: "2px solid var(--ink-300)",
                    fontSize: 12,
                  }}
                >
                  <span style={{ fontFamily: "var(--font-mono)", color: "var(--gray-600)", minWidth: 130 }}>
                    {fmt(log.createdAt)}
                  </span>
                  <span style={{ color: "var(--ink-900)", flex: 1 }}>
                    {trial ? `查看 ${trial.title}` : `targetId=${log.targetId}`}
                    {trial ? (
                      <span style={{ color: "var(--gray-500)", marginLeft: 8 }}>
                        /trials/{trial.slug}
                      </span>
                    ) : null}
                  </span>
                </div>
              );
            })}
          </div>
        )}
        <p style={{ marginTop: 10, fontSize: 11, color: "var(--gray-500)", fontFamily: "var(--font-mono)" }}>
          共 {logs.length} 条 · 去重 trial 数 {trialIds.length}
        </p>
      </section>

      {lock.appealText ? (
        <section style={{ marginTop: 28 }}>
          <h3 style={{ fontFamily: "var(--font-serif)", fontWeight: 400, fontSize: 22, marginBottom: 14, paddingBottom: 8, borderBottom: "1px dashed var(--ink-200)" }}>
            用户申诉内容
          </h3>
          <div
            style={{
              background: "var(--cream-100)",
              borderLeft: "3px solid var(--accent)",
              padding: "16px 18px",
              borderRadius: "var(--r-sm)",
            }}
          >
            <strong style={{ display: "block", fontSize: 11, color: "var(--gray-600)", fontFamily: "var(--font-mono)", letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 6 }}>
              提交时间 · {lock.appealedAt ? fmt(lock.appealedAt) : "—"}
            </strong>
            <p style={{ margin: 0, fontSize: "var(--fs-sm)", lineHeight: 1.7, color: "var(--ink-900)" }}>
              {lock.appealText}
            </p>
          </div>
        </section>
      ) : null}

      {lock.appealReplyText ? (
        <section style={{ marginTop: 20 }}>
          <div
            style={{
              padding: "14px 18px",
              background: lock.appealStatus === "approved" ? "var(--success-50)" : "var(--danger-50)",
              borderRadius: "var(--r-sm)",
              borderLeft: `3px solid ${lock.appealStatus === "approved" ? "var(--success-500)" : "var(--danger-500)"}`,
              fontSize: "var(--fs-sm)",
              lineHeight: 1.7,
              color: lock.appealStatus === "approved" ? "var(--success-700)" : "var(--danger-700)",
            }}
          >
            <strong>本次回复：</strong>
            {lock.appealReplyText}
          </div>
        </section>
      ) : null}

      <section style={{ marginTop: 28 }}>
        <h3 style={{ fontFamily: "var(--font-serif)", fontWeight: 400, fontSize: 22, marginBottom: 14, paddingBottom: 8, borderBottom: "1px dashed var(--ink-200)" }}>
          处理操作
        </h3>
        <LockActionPanel
          lockId={lock.id}
          hasAppeal={lock.appealStatus === "pending"}
          alreadyUnlocked={alreadyUnlocked}
        />
      </section>
    </div>
  );
}

function KV({
  label,
  value,
  wide,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div
      style={{
        background: "var(--cream-100)",
        padding: "10px 14px",
        borderRadius: "var(--r-sm)",
        ...(wide ? { gridColumn: "1 / -1" } : {}),
      }}
    >
      <strong
        style={{
          display: "block",
          fontSize: 11,
          color: "var(--gray-600)",
          fontFamily: "var(--font-mono)",
          letterSpacing: ".08em",
          textTransform: "uppercase",
          marginBottom: 2,
        }}
      >
        {label}
      </strong>
      <span style={{ color: "var(--ink-900)", fontSize: "var(--fs-sm)" }}>{value}</span>
    </div>
  );
}
