import { redirect } from "next/navigation";
import Link from "next/link";
import { getAdminSession } from "@/lib/admin-session";
import { prisma } from "@/lib/prisma";
import { TemplateToggle } from "./TemplateToggle";

function fmtDateTime(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const SCENARIO_LABELS: Record<string, string> = {
  new_user_welcome: "新手欢迎",
  faq_post_trigger: "FAQ 关键词回复",
};

export default async function AiAccountPage() {
  const session = await getAdminSession();
  if (session.role !== "admin") redirect("/admin");

  const aiUser = await prisma.user.findFirst({
    where: { phone: "__system_ai__" },
    select: { id: true, phone: true, displayName: true, createdAt: true },
  });

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [templates, recentComments, recentTriggerCount] = await Promise.all([
    prisma.aiAccountTemplate.findMany({
      orderBy: { createdAt: "asc" },
    }),
    aiUser
      ? prisma.communityComment.findMany({
          where: { authorUserId: aiUser.id },
          orderBy: { createdAt: "desc" },
          take: 50,
          select: {
            id: true,
            content: true,
            createdAt: true,
            postId: true,
            post: {
              select: {
                id: true,
                title: true,
                group: { select: { name: true } },
              },
            },
          },
        })
      : Promise.resolve([]),
    aiUser
      ? prisma.communityComment.count({
          where: {
            authorUserId: aiUser.id,
            createdAt: { gte: sevenDaysAgo },
          },
        })
      : Promise.resolve(0),
  ]);

  const section = (title: string, children: React.ReactNode) => (
    <div
      style={{
        padding: 20,
        background: "var(--cream-0)",
        border: "var(--border)",
        borderRadius: "var(--r-md)",
        marginBottom: 20,
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

  return (
    <div className="admin-page">
      <div className="admin-page__header">
        <h1>AI 账号管理</h1>
      </div>

      {section(
        "AI 账号概况",
        aiUser ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            {[
              { label: "账号标识", value: aiUser.phone },
              { label: "显示名称", value: aiUser.displayName ?? "—" },
              { label: "近 7 天触发次数", value: recentTriggerCount },
            ].map((item) => (
              <div key={item.label}>
                <div style={{ fontSize: "var(--fs-xs)", color: "var(--gray-500)", marginBottom: 4 }}>
                  {item.label}
                </div>
                <div style={{ fontWeight: 600, fontSize: "var(--fs-base)" }}>{item.value}</div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: "var(--gray-400)", fontSize: "var(--fs-sm)" }}>
            未找到 AI 账号（__system_ai__），请先运行 seed。
          </p>
        ),
      )}

      {section(
        "回复模板",
        <table className="admin-table">
          <thead>
            <tr>
              <th>场景</th>
              <th>触发规则</th>
              <th>内容模板</th>
              <th>最后修改</th>
              <th>启用</th>
            </tr>
          </thead>
          <tbody>
            {templates.map((t) => (
              <tr key={t.id}>
                <td>
                  <span style={{ fontWeight: 600 }}>
                    {SCENARIO_LABELS[t.scenario] ?? t.scenario}
                  </span>
                  <br />
                  <span style={{ fontSize: "var(--fs-xs)", color: "var(--gray-400)", fontFamily: "monospace" }}>
                    {t.scenario}
                  </span>
                </td>
                <td>
                  <pre
                    style={{
                      whiteSpace: "pre-wrap",
                      fontFamily: "monospace",
                      fontSize: "var(--fs-xs)",
                      background: "var(--ink-50, #f8f8f6)",
                      padding: "8px 10px",
                      borderRadius: "var(--r-sm)",
                      margin: 0,
                      maxWidth: 260,
                      wordBreak: "break-all",
                    }}
                  >
                    {JSON.stringify(JSON.parse(t.triggerRule), null, 2)}
                  </pre>
                </td>
                <td>
                  <pre
                    style={{
                      whiteSpace: "pre-wrap",
                      fontFamily: "var(--font-sans)",
                      fontSize: "var(--fs-xs)",
                      margin: 0,
                      maxWidth: 300,
                      lineHeight: 1.5,
                    }}
                  >
                    {t.contentTemplate}
                  </pre>
                </td>
                <td style={{ fontSize: "var(--fs-xs)", color: "var(--gray-500)" }}>
                  {fmtDateTime(t.updatedAt)}
                </td>
                <td>
                  <TemplateToggle
                    templateId={t.id}
                    enabled={t.isEnabled}
                    scenario={t.scenario}
                  />
                </td>
              </tr>
            ))}
            {templates.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", color: "var(--gray-400)", padding: 24 }}>
                  暂无模板
                </td>
              </tr>
            )}
          </tbody>
        </table>,
      )}

      {section(
        "最近 AI 评论触发日志（50 条）",
        recentComments.length === 0 ? (
          <p style={{ color: "var(--gray-400)", fontSize: "var(--fs-sm)" }}>暂无触发记录</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>时间</th>
                <th>所在帖子</th>
                <th>分区</th>
                <th>内容摘要</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {recentComments.map((c) => (
                <tr key={c.id}>
                  <td style={{ fontSize: "var(--fs-xs)", color: "var(--gray-500)", whiteSpace: "nowrap" }}>
                    {fmtDateTime(c.createdAt)}
                  </td>
                  <td style={{ fontSize: "var(--fs-sm)", maxWidth: 200 }}>
                    {c.post?.title ?? <span style={{ color: "var(--gray-400)" }}>—</span>}
                  </td>
                  <td style={{ fontSize: "var(--fs-sm)" }}>
                    {c.post?.group?.name ?? <span style={{ color: "var(--gray-400)" }}>—</span>}
                  </td>
                  <td
                    style={{
                      fontSize: "var(--fs-xs)",
                      color: "var(--gray-600)",
                      maxWidth: 300,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {c.content.slice(0, 60)}
                    {c.content.length > 60 ? "…" : ""}
                  </td>
                  <td>
                    {c.post ? (
                      <Link
                        href={`/admin/community/posts/${c.post.id}`}
                        style={{ color: "var(--brand-600)", fontSize: "var(--fs-sm)" }}
                      >
                        查看帖子
                      </Link>
                    ) : (
                      <span style={{ color: "var(--gray-400)" }}>—</span>
                    )}
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
