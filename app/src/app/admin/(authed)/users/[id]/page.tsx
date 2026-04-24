import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getAdminSession } from "@/lib/admin-session";
import { prisma } from "@/lib/prisma";
import { UserRoleActions } from "./UserRoleActions";

function fmtDateTime(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fmtBytes(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getAdminSession();
  if (session.role !== "admin") redirect("/admin");

  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      phone: true,
      displayName: true,
      role: true,
      isSystemAi: true,
      createdAt: true,
      lastLoginAt: true,
      symptomsText: true,
      aiDiseaseTags: true,
      symptomsUpdatedAt: true,
      medicalRecords: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          filename: true,
          originalName: true,
          mimeType: true,
          sizeBytes: true,
          note: true,
          isReviewed: true,
          createdAt: true,
        },
      },
      groupMemberships: {
        where: { leftAt: null },
        orderBy: { joinedAt: "desc" },
        select: {
          id: true,
          joinedAt: true,
          group: { select: { name: true } },
        },
      },
    },
  });

  if (!user) notFound();

  const behaviorLogs = await prisma.userBehaviorLog.findMany({
    where: { userId: id },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { id: true, action: true, targetId: true, createdAt: true },
  });

  let aiTagsList: string[] = [];
  if (user.aiDiseaseTags) {
    try {
      const parsed = JSON.parse(user.aiDiseaseTags);
      if (Array.isArray(parsed)) aiTagsList = parsed.map(String);
    } catch {
      /* ignore */
    }
  }

  const effectiveRole = user.isSystemAi ? "ai" : user.role;
  const roleLabel: Record<string, string> = { patient: "患者", doctor: "医生", ai: "AI" };

  const section = (title: string, children: React.ReactNode) => (
    <div
      style={{
        padding: 20,
        background: "var(--cream-0)",
        border: "var(--border)",
        borderRadius: "var(--r-md)",
        marginBottom: 16,
      }}
    >
      <h3
        style={{
          fontSize: "var(--fs-base)",
          fontFamily: "var(--font-serif)",
          fontWeight: 400,
          marginBottom: 14,
          paddingBottom: 10,
          borderBottom: "var(--border)",
        }}
      >
        {title}
      </h3>
      {children}
    </div>
  );

  const row = (label: string, value: React.ReactNode) => (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "120px 1fr",
        gap: 12,
        marginBottom: 10,
        fontSize: "var(--fs-sm)",
      }}
    >
      <span style={{ color: "var(--gray-500)" }}>{label}</span>
      <span>{value ?? <span style={{ color: "var(--gray-400)" }}>—</span>}</span>
    </div>
  );

  return (
    <div className="admin-page">
      <div className="admin-page__header" style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <Link href="/admin/users" style={{ color: "var(--gray-500)", fontSize: "var(--fs-sm)" }}>
          &larr; 用户列表
        </Link>
        <h1 style={{ flex: 1 }}>{user.displayName ?? user.phone}</h1>
        <UserRoleActions
          userId={user.id}
          displayName={user.displayName ?? user.phone}
          role={user.role}
          isSystemAi={user.isSystemAi}
        />
      </div>

      {section(
        "基本资料",
        <>
          {row("ID", <span style={{ fontFamily: "monospace", fontSize: "var(--fs-xs)" }}>{user.id}</span>)}
          {row("手机号", user.phone)}
          {row("显示名", user.displayName)}
          {row(
            "角色",
            <span
              className={`chip ${
                effectiveRole === "doctor"
                  ? "chip--qualified"
                  : effectiveRole === "ai"
                  ? "chip--contacted"
                  : "chip--closed"
              }`}
            >
              {roleLabel[effectiveRole] ?? effectiveRole}
            </span>,
          )}
          {row("AI 账号", user.isSystemAi ? "是" : "否")}
          {row("注册时间", fmtDateTime(user.createdAt))}
          {row("最近登录", user.lastLoginAt ? fmtDateTime(user.lastLoginAt) : null)}
        </>,
      )}

      {section(
        "症状与 AI 标签",
        <>
          {row(
            "症状描述",
            user.symptomsText ? (
              <pre
                style={{
                  whiteSpace: "pre-wrap",
                  fontFamily: "var(--font-sans)",
                  fontSize: "var(--fs-sm)",
                  margin: 0,
                  lineHeight: 1.6,
                }}
              >
                {user.symptomsText}
              </pre>
            ) : null,
          )}
          {row(
            "AI 疾病标签",
            aiTagsList.length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {aiTagsList.map((tag) => (
                  <span key={tag} className="chip chip--contacted" style={{ fontSize: "var(--fs-xs)" }}>
                    {tag}
                  </span>
                ))}
              </div>
            ) : null,
          )}
          {row(
            "症状更新时间",
            user.symptomsUpdatedAt ? fmtDateTime(user.symptomsUpdatedAt) : null,
          )}
        </>,
      )}

      {section(
        `上传文件（${user.medicalRecords.length} 条）`,
        user.medicalRecords.length === 0 ? (
          <p style={{ color: "var(--gray-400)", fontSize: "var(--fs-sm)" }}>暂无文件</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>文件名</th>
                <th>类型</th>
                <th>大小</th>
                <th>备注</th>
                <th>审核</th>
                <th>上传时间</th>
                <th>下载</th>
              </tr>
            </thead>
            <tbody>
              {user.medicalRecords.map((rec) => (
                <tr key={rec.id}>
                  <td style={{ fontSize: "var(--fs-xs)", fontFamily: "monospace" }}>
                    {rec.originalName}
                  </td>
                  <td style={{ fontSize: "var(--fs-xs)", color: "var(--gray-500)" }}>
                    {rec.mimeType}
                  </td>
                  <td style={{ fontSize: "var(--fs-xs)" }}>{fmtBytes(rec.sizeBytes)}</td>
                  <td style={{ fontSize: "var(--fs-xs)", color: "var(--gray-500)" }}>
                    {rec.note ?? "—"}
                  </td>
                  <td>
                    <span
                      className={`chip ${rec.isReviewed ? "chip--qualified" : "chip--closed"}`}
                    >
                      {rec.isReviewed ? "已审" : "待审"}
                    </span>
                  </td>
                  <td style={{ fontSize: "var(--fs-xs)", color: "var(--gray-500)" }}>
                    {fmtDateTime(rec.createdAt)}
                  </td>
                  <td>
                    <a
                      href={`/api/admin/users/${user.id}/records/${rec.id}/download`}
                      style={{ color: "var(--brand-600)", fontSize: "var(--fs-sm)" }}
                    >
                      下载
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ),
      )}

      {section(
        "行为日志（最近 5 条）",
        behaviorLogs.length === 0 ? (
          <p style={{ color: "var(--gray-400)", fontSize: "var(--fs-sm)" }}>暂无记录</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>动作</th>
                <th>目标 ID</th>
                <th>时间</th>
              </tr>
            </thead>
            <tbody>
              {behaviorLogs.map((log) => (
                <tr key={log.id}>
                  <td style={{ fontSize: "var(--fs-xs)", fontFamily: "monospace" }}>{log.action}</td>
                  <td style={{ fontSize: "var(--fs-xs)", color: "var(--gray-500)" }}>
                    {log.targetId ?? "—"}
                  </td>
                  <td style={{ fontSize: "var(--fs-xs)", color: "var(--gray-500)" }}>
                    {fmtDateTime(log.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ),
      )}

      {section(
        `社区分区（${user.groupMemberships.length} 个）`,
        user.groupMemberships.length === 0 ? (
          <p style={{ color: "var(--gray-400)", fontSize: "var(--fs-sm)" }}>未加入任何分区</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>分区名</th>
                <th>加入时间</th>
              </tr>
            </thead>
            <tbody>
              {user.groupMemberships.map((m) => (
                <tr key={m.id}>
                  <td>{m.group.name}</td>
                  <td style={{ fontSize: "var(--fs-xs)", color: "var(--gray-500)" }}>
                    {fmtDateTime(m.joinedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ),
      )}
    </div>
  );
}
