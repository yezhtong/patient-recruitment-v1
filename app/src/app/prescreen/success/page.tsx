import Link from "next/link";
import { SiteShell } from "@/components/SiteShell";
import { prisma } from "@/lib/prisma";
import "./styles.css";

function formatSubmissionId(lead: { createdAt: Date; id: string } | null): string {
  if (!lead) {
    const d = new Date();
    return `PS-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}-XXXX`;
  }
  const d = lead.createdAt;
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `PS-${ymd}-${lead.id.slice(-6).toUpperCase()}`;
}

export default async function PrescreenSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ slug?: string; leadId?: string }>;
}) {
  const { slug, leadId } = await searchParams;
  let trialTitle: string | null = null;
  let lead: { id: string; createdAt: Date } | null = null;
  if (leadId) {
    lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { id: true, createdAt: true, trial: { select: { title: true } } },
    }).then((r) => {
      if (r) trialTitle = r.trial.title;
      return r ? { id: r.id, createdAt: r.createdAt } : null;
    });
  } else if (slug) {
    const trial = await prisma.clinicalTrial.findUnique({
      where: { slug },
      select: { title: true },
    });
    trialTitle = trial?.title ?? null;
  }
  const submissionId = formatSubmissionId(lead);

  return (
    <SiteShell>
      <div className="success-shell" style={{ padding: "80px 0 96px" }}>
        <div className="container" style={{ maxWidth: 1000 }}>
          <div
            className="success-card"
            role="status"
            aria-live="polite"
            style={{
              background: "var(--ink-900)",
              color: "var(--cream-50)",
              borderRadius: "var(--r-3xl)",
              padding: "80px 64px",
              textAlign: "center",
              marginBottom: 32,
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              className="success-card__deco"
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: 0,
                pointerEvents: "none",
                opacity: 0.12,
                backgroundImage:
                  "radial-gradient(circle at 20% 30%, var(--lime), transparent 40%), radial-gradient(circle at 80% 70%, var(--accent), transparent 40%)",
              }}
            />
            <div
              className="success-icon"
              style={{
                position: "relative",
                zIndex: 1,
                width: 120,
                height: 120,
                borderRadius: "50%",
                background: "var(--lime)",
                color: "var(--ink-900)",
                display: "grid",
                placeItems: "center",
                margin: "0 auto 32px",
                fontSize: 56,
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
                boxShadow: "0 0 0 12px rgba(200,255,74,.15)",
              }}
            >
              ✓
            </div>
            <div style={{ position: "relative", zIndex: 1 }}>
              <span className="eyebrow eyebrow--center" style={{ color: "var(--lime)", justifyContent: "center" }}>
                ★ 预筛已提交
              </span>
              <h1 style={{ color: "var(--cream-50)", fontSize: "clamp(48px, 6vw, 80px)", marginTop: 18, marginBottom: 16 }}>
                就这样，
                <br />
                <em style={{ color: "var(--lime)", fontStyle: "italic" }}>已经成功了</em>
              </h1>
              <p className="lead" style={{ color: "rgba(253,250,243,.85)", fontSize: "var(--fs-xl)", marginBottom: 32, maxWidth: "50ch", marginLeft: "auto", marginRight: "auto", lineHeight: 1.5 }}>
                {trialTitle ? `《${trialTitle}》预筛资料已进入审核。` : ""}
                运营团队会在 24 小时内通过电话或微信联系你，确认后续安排。
              </p>
              <div
                className="success-id"
                style={{
                  display: "inline-flex",
                  gap: 12,
                  alignItems: "center",
                  padding: "12px 24px",
                  background: "rgba(253,250,243,.08)",
                  border: "1px solid rgba(253,250,243,.2)",
                  borderRadius: "var(--r-pill)",
                  fontFamily: "var(--font-mono)",
                  fontSize: "var(--fs-sm)",
                  color: "rgba(253,250,243,.7)",
                  letterSpacing: ".04em",
                }}
              >
                提交编号 <strong className="tabular" style={{ color: "var(--lime)" }}>{submissionId}</strong>
              </div>

              <div
                className="next-steps"
                aria-label="后续步骤"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 0,
                  textAlign: "left",
                  margin: "56px auto 40px",
                  maxWidth: 800,
                  borderTop: "1px solid rgba(253,250,243,.15)",
                  borderLeft: "1px solid rgba(253,250,243,.15)",
                }}
              >
                <div className="next-step" style={{ padding: 24, borderRight: "1px solid rgba(253,250,243,.15)", borderBottom: "1px solid rgba(253,250,243,.15)" }}>
                  <div className="next-step__num" style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--lime)", letterSpacing: ".12em", marginBottom: 14 }}>/ 01 等待</div>
                  <h4 style={{ color: "var(--cream-50)", fontFamily: "var(--font-serif)", fontSize: 22, fontWeight: 400, marginBottom: 6 }}>电话联系</h4>
                  <p style={{ color: "rgba(253,250,243,.7)", fontSize: "var(--fs-sm)", margin: 0, lineHeight: 1.5 }}>
                    注意 021 / 138 开头的电话与微信好友请求。
                  </p>
                </div>
                <div className="next-step" style={{ padding: 24, borderRight: "1px solid rgba(253,250,243,.15)", borderBottom: "1px solid rgba(253,250,243,.15)" }}>
                  <div className="next-step__num" style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--lime)", letterSpacing: ".12em", marginBottom: 14 }}>/ 02 沟通</div>
                  <h4 style={{ color: "var(--cream-50)", fontFamily: "var(--font-serif)", fontSize: 22, fontWeight: 400, marginBottom: 6 }}>确认信息</h4>
                  <p style={{ color: "rgba(253,250,243,.7)", fontSize: "var(--fs-sm)", margin: 0, lineHeight: 1.5 }}>
                    运营会与你确认基础信息和就诊安排。
                  </p>
                </div>
                <div className="next-step" style={{ padding: 24, borderRight: "1px solid rgba(253,250,243,.15)", borderBottom: "1px solid rgba(253,250,243,.15)" }}>
                  <div className="next-step__num" style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--lime)", letterSpacing: ".12em", marginBottom: 14 }}>/ 03 入组</div>
                  <h4 style={{ color: "var(--cream-50)", fontFamily: "var(--font-serif)", fontSize: 22, fontWeight: 400, marginBottom: 6 }}>安排面诊</h4>
                  <p style={{ color: "rgba(253,250,243,.7)", fontSize: "var(--fs-sm)", margin: 0, lineHeight: 1.5 }}>
                    符合条件后将安排你到研究中心面诊。
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
                <Link href="/me" className="btn btn--primary btn--lg">
                  查看我的报名 <span className="arrow">→</span>
                </Link>
                <Link
                  href="/trials"
                  className="btn btn--ghost btn--lg"
                  style={{ borderColor: "rgba(253,250,243,.3)", color: "var(--cream-50)" }}
                >
                  浏览其他项目
                </Link>
              </div>
            </div>
          </div>

          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <span className="eyebrow eyebrow--center" style={{ justifyContent: "center" }}>
              ★ 在等待联系的时候
            </span>
            <h3 style={{ marginTop: 14, fontFamily: "var(--font-serif)", fontSize: 36, fontWeight: 400, letterSpacing: "-.01em" }}>
              你也可以<em style={{ color: "var(--accent)", fontStyle: "italic" }}> 这样做</em>
            </h3>
          </div>

          <div
            className="recommend-grid"
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}
          >
            <div
              className="recommend-card"
              style={{ background: "var(--cream-0)", border: "var(--border)", borderRadius: "var(--r-xl)", padding: 32 }}
            >
              <span className="eyebrow">有疑问</span>
              <h4 style={{ marginTop: 14, fontFamily: "var(--font-serif)", fontSize: 26, fontWeight: 400, marginBottom: 8 }}>
                直接<em style={{ color: "var(--accent)", fontStyle: "italic" }}>给我们打电话</em>
              </h4>
              <p style={{ color: "var(--gray-600)", fontSize: "var(--fs-md)", marginBottom: 20, lineHeight: 1.6 }}>
                在等待联系的时候，任何疑问都可以拨打 <strong>400-888-1688</strong>，工作日 9:00–18:00。
              </p>
              <Link href="/contact" className="btn btn--ink">
                联系我们 <span className="arrow">→</span>
              </Link>
            </div>
            <div
              className="recommend-card"
              style={{ background: "var(--cream-0)", border: "var(--border)", borderRadius: "var(--r-xl)", padding: 32 }}
            >
              <span className="eyebrow">学习指南</span>
              <h4 style={{ marginTop: 14, fontFamily: "var(--font-serif)", fontSize: 26, fontWeight: 400, marginBottom: 8 }}>
                看懂<em style={{ color: "var(--accent)", fontStyle: "italic" }}>临床试验</em>
              </h4>
              <p style={{ color: "var(--gray-600)", fontSize: "var(--fs-md)", marginBottom: 20, lineHeight: 1.6 }}>
                &ldquo;知情同意书&rdquo;要签什么？&ldquo;III 期&rdquo;是什么意思？常见问题这里有答案。
              </p>
              <Link href="/about" className="btn btn--ink">
                查看 FAQ <span className="arrow">→</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </SiteShell>
  );
}
