import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "封锁管理 · 九泰临研后台",
};

type Filter = "all" | "pending" | "rejected" | "unlocked";

const FILTER_LABEL: Record<Filter, string> = {
  all: "全部",
  pending: "有申诉待处理",
  rejected: "申诉已驳回",
  unlocked: "近 7 天已解锁",
};

function fmt(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${m}-${day} ${hh}:${mm}`;
}

function maskPhone(phone: string): string {
  if (!phone || phone.length < 7) return phone;
  return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
}

export default async function AdminLocksPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter: filterParam } = await searchParams;
  const filter: Filter =
    filterParam === "pending" || filterParam === "rejected" || filterParam === "unlocked"
      ? filterParam
      : "all";

  const whereBase =
    filter === "pending"
      ? { appealStatus: "pending", unlockedAt: null }
      : filter === "rejected"
        ? { appealStatus: "rejected" }
        : filter === "unlocked"
          ? {
              unlockedAt: {
                gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
              },
            }
          : {};

  const [
    locks,
    currentlyLockedCount,
    pendingAppealCount,
    todayCount,
    recentlyUnlockedCount,
  ] = await Promise.all([
    prisma.accountLock.findMany({
      where: whereBase,
      orderBy: { lockedAt: "desc" },
      take: 50,
      include: {
        user: { select: { phone: true, displayName: true, createdAt: true } },
      },
    }),
    prisma.accountLock.count({ where: { unlockedAt: null } }),
    prisma.accountLock.count({
      where: { appealStatus: "pending", unlockedAt: null },
    }),
    prisma.accountLock.count({
      where: {
        lockedAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    }),
    prisma.accountLock.count({
      where: {
        unlockedAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
    }),
  ]);

  return (
    <div className="page-head">
      <div>
        <span className="eyebrow">◉ Account Lock</span>
        <h2 style={{ marginTop: 14 }}>封锁管理</h2>
        <p className="page-head__sub">
          当前锁定 <strong>{currentlyLockedCount}</strong> 个账号，其中{" "}
          <strong style={{ color: "var(--warning-700)" }}>{pendingAppealCount}</strong>{" "}
          个有待处理的申诉。
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 12,
          margin: "20px 0 24px",
        }}
      >
        {[
          { label: "当前锁定", value: currentlyLockedCount, tone: "" },
          {
            label: "待处理申诉",
            value: pendingAppealCount,
            tone: "color: var(--warning-700)",
          },
          { label: "今日新增", value: todayCount, tone: "" },
          {
            label: "近 7 天解锁",
            value: recentlyUnlockedCount,
            tone: "color: var(--success-700)",
          },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              padding: "14px 18px",
              background: "var(--cream-0)",
              border: "var(--border)",
              borderRadius: "var(--r-md)",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--gray-600)",
                letterSpacing: ".1em",
                textTransform: "uppercase",
              }}
            >
              {s.label}
            </div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 28,
                fontWeight: 700,
                color: "var(--ink-900)",
                marginTop: 4,
                ...(s.tone.includes("warning") ? { color: "var(--warning-700)" } : {}),
                ...(s.tone.includes("success") ? { color: "var(--success-700)" } : {}),
              }}
            >
              {s.value}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {(Object.keys(FILTER_LABEL) as Filter[]).map((f) => (
          <Link
            key={f}
            href={`/admin/locks${f === "all" ? "" : `?filter=${f}`}`}
            style={{
              padding: "6px 14px",
              borderRadius: "var(--r-pill)",
              background: f === filter ? "var(--ink-900)" : "var(--cream-0)",
              color: f === filter ? "var(--cream-50)" : "var(--ink-900)",
              border: f === filter ? "1px solid var(--ink-900)" : "1px solid var(--ink-200)",
              fontSize: "var(--fs-sm)",
              textDecoration: "none",
            }}
          >
            {FILTER_LABEL[f]}
          </Link>
        ))}
      </div>

      {locks.length === 0 ? (
        <div
          style={{
            padding: 40,
            textAlign: "center",
            background: "var(--cream-0)",
            border: "var(--border)",
            borderRadius: "var(--r-md)",
            color: "var(--gray-500)",
          }}
        >
          当前筛选下没有封锁记录。
        </div>
      ) : (
        <div
          style={{
            background: "var(--cream-0)",
            border: "var(--border)",
            borderRadius: "var(--r-md)",
            overflow: "hidden",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--cream-100)" }}>
                <th
                  style={{
                    padding: "12px 14px",
                    textAlign: "left",
                    fontSize: 11,
                    fontFamily: "var(--font-mono)",
                    letterSpacing: ".08em",
                    textTransform: "uppercase",
                    color: "var(--gray-600)",
                    fontWeight: 600,
                    borderBottom: "1px solid var(--ink-100)",
                  }}
                >
                  用户
                </th>
                <th style={{ padding: "12px 14px", textAlign: "left", fontSize: 11, fontFamily: "var(--font-mono)", letterSpacing: ".08em", textTransform: "uppercase", color: "var(--gray-600)", fontWeight: 600, borderBottom: "1px solid var(--ink-100)" }}>
                  封锁时间
                </th>
                <th style={{ padding: "12px 14px", textAlign: "left", fontSize: 11, fontFamily: "var(--font-mono)", letterSpacing: ".08em", textTransform: "uppercase", color: "var(--gray-600)", fontWeight: 600, borderBottom: "1px solid var(--ink-100)" }}>
                  触发规则
                </th>
                <th style={{ padding: "12px 14px", textAlign: "left", fontSize: 11, fontFamily: "var(--font-mono)", letterSpacing: ".08em", textTransform: "uppercase", color: "var(--gray-600)", fontWeight: 600, borderBottom: "1px solid var(--ink-100)" }}>
                  申诉状态
                </th>
                <th style={{ padding: "12px 14px", textAlign: "left", fontSize: 11, fontFamily: "var(--font-mono)", letterSpacing: ".08em", textTransform: "uppercase", color: "var(--gray-600)", fontWeight: 600, borderBottom: "1px solid var(--ink-100)" }}>
                  工单号
                </th>
                <th style={{ padding: "12px 14px", textAlign: "right", fontSize: 11, fontFamily: "var(--font-mono)", letterSpacing: ".08em", textTransform: "uppercase", color: "var(--gray-600)", fontWeight: 600, borderBottom: "1px solid var(--ink-100)" }}>
                  操作
                </th>
              </tr>
            </thead>
            <tbody>
              {locks.map((l) => {
                const pillTone =
                  l.unlockedAt
                    ? "approved"
                    : l.appealStatus === "pending"
                      ? "pending"
                      : l.appealStatus === "rejected"
                        ? "rejected"
                        : "none";
                const pillLabel =
                  l.unlockedAt
                    ? "已解锁"
                    : l.appealStatus === "pending"
                      ? "⏳ 处理中"
                      : l.appealStatus === "rejected"
                        ? "⊘ 已驳回"
                        : "— 未申诉";
                return (
                  <tr key={l.id}>
                    <td style={{ padding: "12px 14px", borderBottom: "1px solid var(--ink-100)", fontSize: 13 }}>
                      <div style={{ fontWeight: 500, color: "var(--ink-900)" }}>
                        {l.user.displayName ?? "未命名"}
                      </div>
                      <div style={{ fontFamily: "var(--font-mono)", color: "var(--gray-600)", fontSize: 12 }}>
                        {maskPhone(l.user.phone)}
                      </div>
                    </td>
                    <td style={{ padding: "12px 14px", borderBottom: "1px solid var(--ink-100)", fontSize: 13, color: "var(--gray-700)" }}>
                      {fmt(l.lockedAt)}
                    </td>
                    <td style={{ padding: "12px 14px", borderBottom: "1px solid var(--ink-100)", fontSize: 12 }}>
                      <code
                        style={{
                          fontFamily: "var(--font-mono)",
                          background: "var(--accent-soft)",
                          color: "var(--accent-dark)",
                          padding: "2px 8px",
                          borderRadius: "var(--r-sm)",
                          fontSize: 11,
                        }}
                      >
                        {l.triggeredBy ?? "—"}
                      </code>
                    </td>
                    <td style={{ padding: "12px 14px", borderBottom: "1px solid var(--ink-100)", fontSize: 12 }}>
                      <span
                        style={{
                          padding: "2px 10px",
                          borderRadius: "var(--r-pill)",
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          letterSpacing: ".05em",
                          textTransform: "uppercase",
                          background:
                            pillTone === "pending"
                              ? "var(--warning-50)"
                              : pillTone === "approved"
                                ? "var(--success-50)"
                                : pillTone === "rejected"
                                  ? "var(--danger-50)"
                                  : "var(--gray-100)",
                          color:
                            pillTone === "pending"
                              ? "var(--warning-700)"
                              : pillTone === "approved"
                                ? "var(--success-700)"
                                : pillTone === "rejected"
                                  ? "var(--danger-700)"
                                  : "var(--gray-600)",
                        }}
                      >
                        {pillLabel}
                      </span>
                    </td>
                    <td style={{ padding: "12px 14px", borderBottom: "1px solid var(--ink-100)" }}>
                      <code style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--gray-700)" }}>
                        LCK-{l.id.slice(0, 8).toUpperCase()}
                      </code>
                    </td>
                    <td style={{ padding: "12px 14px", borderBottom: "1px solid var(--ink-100)", textAlign: "right" }}>
                      <Link href={`/admin/locks/${l.id}`} style={{ color: "var(--accent)", fontSize: 13, textDecoration: "none" }}>
                        查看 →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
