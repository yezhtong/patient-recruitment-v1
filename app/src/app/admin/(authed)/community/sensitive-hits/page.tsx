import Link from "next/link";
import { prisma } from "@/lib/prisma";

const RISK_LABEL: Record<string, string> = {
  contact: "联系方式",
  "drug-sale": "售药 / 代购",
  "enroll-promise": "违规入组承诺",
  quackery: "偏方 / 夸大疗效",
  ad: "引流广告",
};

export default async function SensitiveHitsPage() {
  const grouped = await prisma.communitySensitiveHit.groupBy({
    by: ["keyword", "riskType", "riskLevel"],
    _count: true,
    orderBy: { _count: { keyword: "desc" } },
    take: 50,
  });

  return (
    <>
      <div className="admin-topbar">
        <div>
          <h1>
            风险命中 <em>/ top 50</em>
          </h1>
          <p className="sub">按敏感词聚合的命中统计，用于评估词库效果</p>
        </div>
        <div className="admin-actions">
          <Link href="/admin/community/posts?risk=1" className="btn-admin">
            查看所有命中帖子
          </Link>
        </div>
      </div>

      <table className="admin-table">
        <thead>
          <tr>
            <th>敏感词</th>
            <th>风险类型</th>
            <th>风险级别</th>
            <th>命中数</th>
          </tr>
        </thead>
        <tbody>
          {grouped.map((g, idx) => (
            <tr key={idx}>
              <td style={{ fontFamily: "var(--font-mono)" }}>
                <code>{g.keyword}</code>
              </td>
              <td>{RISK_LABEL[g.riskType] ?? g.riskType}</td>
              <td>
                <span
                  className={`chip ${
                    g.riskLevel === "high" ? "chip--rejected" : "chip--pending"
                  }`}
                >
                  {g.riskLevel}
                </span>
              </td>
              <td>{typeof g._count === "number" ? g._count : 0}</td>
            </tr>
          ))}
          {grouped.length === 0 && (
            <tr>
              <td colSpan={4} style={{ textAlign: "center", padding: "48px 0", color: "var(--gray-500)" }}>
                暂无命中记录
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="admin-card" style={{ marginTop: 20 }}>
        <p className="muted" style={{ fontSize: 13, lineHeight: 1.7 }}>
          词库维护：编辑 <code>app/data/sensitive-words.txt</code>{" "}
          即可。格式：<code>level|type|keyword</code>。重启服务生效。当前为 dev 默认词库，**待运营审定**后再切换到正式版本。
        </p>
      </div>
    </>
  );
}
