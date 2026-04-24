import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin-session";
import { prisma } from "@/lib/prisma";

function maskPhone(phone: string) {
  if (phone.length < 8) return phone;
  return phone.slice(0, 3) + "****" + phone.slice(-4);
}

function fmtDate(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const ROLE_LABEL: Record<string, string> = {
  patient: "患者",
  doctor: "医生",
  ai: "AI",
};

const ROLE_CHIP_CLASS: Record<string, string> = {
  patient: "chip--closed",
  doctor: "chip--qualified",
  ai: "chip--contacted",
};

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; q?: string }>;
}) {
  const session = await getAdminSession();
  if (session.role !== "admin") redirect("/admin");

  const sp = await searchParams;
  const roleFilter = (sp.role ?? "").trim();
  const q = (sp.q ?? "").trim();

  const where: Record<string, unknown> = {};
  if (roleFilter && roleFilter !== "all") where.role = roleFilter;
  if (q) {
    where.OR = [
      { phone: { contains: q } },
      { displayName: { contains: q } },
    ];
  }

  const [users, totalCount, doctorCount, aiCount, withSymptomsCount] =
    await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 200,
        select: {
          id: true,
          phone: true,
          displayName: true,
          role: true,
          isSystemAi: true,
          symptomsText: true,
          aiDiseaseTags: true,
          createdAt: true,
          _count: { select: { medicalRecords: { where: { deletedAt: null } } } },
        },
      }),
      prisma.user.count(),
      prisma.user.count({ where: { role: "doctor" } }),
      prisma.user.count({ where: { isSystemAi: true } }),
      prisma.user.count({ where: { symptomsText: { not: null } } }),
    ]);

  const effectiveRole = (u: { role: string; isSystemAi: boolean }) =>
    u.isSystemAi ? "ai" : u.role;

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <h1>用户管理</h1>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        {[
          { label: "总用户数", value: totalCount },
          { label: "医生数", value: doctorCount },
          { label: "AI 账号", value: aiCount },
          { label: "已填症状", value: withSymptomsCount },
        ].map((kpi) => (
          <div
            key={kpi.label}
            style={{
              padding: "16px 20px",
              background: "var(--cream-0)",
              border: "var(--border)",
              borderRadius: "var(--r-md)",
            }}
          >
            <div style={{ fontSize: "var(--fs-sm)", color: "var(--gray-500)", marginBottom: 4 }}>
              {kpi.label}
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "var(--font-serif)" }}>
              {kpi.value}
            </div>
          </div>
        ))}
      </div>

      <form method="GET" style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <select
          name="role"
          defaultValue={roleFilter || "all"}
          style={{
            padding: "8px 12px",
            border: "var(--border)",
            borderRadius: "var(--r-md)",
            background: "var(--cream-0)",
            fontSize: "var(--fs-sm)",
          }}
        >
          <option value="all">全部角色</option>
          <option value="patient">患者</option>
          <option value="doctor">医生</option>
          <option value="ai">AI</option>
        </select>
        <input
          name="q"
          defaultValue={q}
          placeholder="手机号或显示名搜索"
          style={{
            padding: "8px 12px",
            border: "var(--border)",
            borderRadius: "var(--r-md)",
            background: "var(--cream-0)",
            fontSize: "var(--fs-sm)",
            minWidth: 200,
          }}
        />
        <button type="submit" className="btn btn--primary" style={{ minHeight: 38 }}>
          筛选
        </button>
        <Link href="/admin/users" className="btn" style={{ minHeight: 38, display: "flex", alignItems: "center" }}>
          重置
        </Link>
      </form>

      <div className="admin-card">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>手机</th>
              <th>显示名</th>
              <th>角色</th>
              <th>症状</th>
              <th>AI 标签</th>
              <th>文件数</th>
              <th>注册时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const role = effectiveRole(u);
              const tagCount = u.aiDiseaseTags
                ? (() => {
                    try {
                      const parsed = JSON.parse(u.aiDiseaseTags);
                      return Array.isArray(parsed) ? parsed.length : 0;
                    } catch {
                      return 0;
                    }
                  })()
                : 0;
              return (
                <tr key={u.id}>
                  <td style={{ fontFamily: "monospace", fontSize: "var(--fs-xs)" }}>
                    {u.id.slice(0, 8)}
                  </td>
                  <td>{maskPhone(u.phone)}</td>
                  <td>{u.displayName ?? <span style={{ color: "var(--gray-400)" }}>—</span>}</td>
                  <td>
                    <span className={`chip ${ROLE_CHIP_CLASS[role] ?? "chip--closed"}`}>
                      {ROLE_LABEL[role] ?? role}
                    </span>
                  </td>
                  <td>{u.symptomsText ? "✓" : <span style={{ color: "var(--gray-400)" }}>—</span>}</td>
                  <td>
                    {tagCount > 0 ? (
                      `${tagCount} 条`
                    ) : (
                      <span style={{ color: "var(--gray-400)" }}>—</span>
                    )}
                  </td>
                  <td>{u._count.medicalRecords}</td>
                  <td style={{ fontSize: "var(--fs-xs)", color: "var(--gray-500)" }}>
                    {fmtDate(u.createdAt)}
                  </td>
                  <td>
                    <Link
                      href={`/admin/users/${u.id}`}
                      style={{ color: "var(--brand-600)", fontSize: "var(--fs-sm)" }}
                    >
                      详情
                    </Link>
                  </td>
                </tr>
              );
            })}
            {users.length === 0 && (
              <tr>
                <td colSpan={9} style={{ textAlign: "center", color: "var(--gray-400)", padding: 32 }}>
                  暂无用户
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
