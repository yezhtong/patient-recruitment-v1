import "./styles.css";
import Link from "next/link";
import { SiteShell } from "@/components/SiteShell";
import { ContactForm } from "./ContactForm";

export const metadata = {
  title: "联系我们 — 九泰临研",
  description: "任何关于临床试验的问题，都可以联系九泰临研。电话、微信、邮件，工作时间内人工答复。",
};

export default function ContactPage() {
  return (
    <SiteShell current="contact">
      <section className="contact-hero hero-alt">
        <div className="container">
          <span className="eyebrow">★ 任何疑问都可以问</span>
          <h1 style={{ marginTop: 18 }}>
            不用<em>独自</em>
            <br />
            做这个决定
          </h1>
          <p>电话、微信、邮件，三种方式都可以联系到真人。工作日 9:00–18:00 通常 1–2 小时内回复；周末由邮件客服跟进。</p>
        </div>
      </section>

      <section className="section--tight" style={{ paddingTop: 32 }}>
        <div className="container">
          {/* 三个主联系方式 */}
          <div className="channels">
            <a href="tel:4008009527" className="channel contact-card">
              <span className="channel__id">/ 01 客服热线</span>
              <h3 className="channel__title">
                打个
                <br />
                电话
              </h3>
              <div>
                <div className="channel__sub">最快、最直接的方式。工作日 9:00–18:00 有专人接听。</div>
                <div className="channel__main">400-800-9527</div>
              </div>
              <div className="channel__action">
                <span>立即拨打</span>
                <span>→</span>
              </div>
            </a>

            <a href="#wechat" className="channel contact-card">
              <span className="channel__id">/ 02 微信</span>
              <h3 className="channel__title">
                加我们
                <br />
                的微信
              </h3>
              <div>
                <div className="channel__sub">想慢慢说？微信搜索客服号，文字、语音、图片都可以。</div>
                <div className="channel__main">九泰临研</div>
              </div>
              <div className="channel__action">
                <span>微信搜索</span>
                <span>→</span>
              </div>
            </a>

            <a href="mailto:hello@jiutai-linyan.com" className="channel contact-card">
              <span className="channel__id">/ 03 邮件</span>
              <h3 className="channel__title">
                发
                <br />
                邮件
              </h3>
              <div>
                <div className="channel__sub">复杂问题、希望书面回复，发邮件最合适。周末客服也会通过邮件跟进。</div>
                <div className="channel__main">hello@jiutai-linyan.com</div>
              </div>
              <div className="channel__action">
                <span>发送邮件</span>
                <span>→</span>
              </div>
            </a>
          </div>

          {/* 表单 + 信息两栏 */}
          <div className="contact-grid">
            {/* 左：留言表单 */}
            <div className="form-card">
              <span className="eyebrow">给我们留言</span>
              <h3 style={{ marginTop: 14 }}>
                说说你的<em style={{ color: "var(--accent)", fontStyle: "italic" }}>疑问</em>
              </h3>
              <p className="lead">填一下表单，我们会在 24 小时内通过你留下的方式联系你。</p>

              <ContactForm />
            </div>

            {/* 右：信息块 */}
            <div>
              <div className="info-block">
                <span className="label">★ 客服工作时间</span>
                <h4>什么时候找得到人</h4>
                <table className="hours-table">
                  <tbody>
                    <tr>
                      <td>周一至周五</td>
                      <td>09:00 — 18:00</td>
                    </tr>
                    <tr>
                      <td>周六 / 周日</td>
                      <td>邮件客服</td>
                    </tr>
                    <tr>
                      <td>国家法定假日</td>
                      <td>仅紧急情况</td>
                    </tr>
                  </tbody>
                </table>
                <p style={{ marginTop: 14, color: "var(--gray-500)", fontSize: "var(--fs-sm)" }}>
                  非工作时间留言，我们会在下一个工作日上午优先处理。
                </p>
              </div>

              <div className="info-block">
                <span className="label">★ 公司地址</span>
                <h4>线下办公地点</h4>
                <p>
                  北京市海淀区
                  <br />
                  中关村大街 27 号 · 中关村大厦 18 层
                </p>
                <div className="map-placeholder" aria-label="九泰药械办公地址">
                  <div className="map-placeholder__pin">九泰药械 · Beijing</div>
                </div>
                <p
                  style={{
                    marginTop: 14,
                    color: "var(--gray-500)",
                    fontSize: "var(--fs-sm)",
                    fontFamily: "var(--font-mono)",
                    letterSpacing: ".04em",
                    textTransform: "uppercase",
                  }}
                >
                  ★ 来访请提前预约
                </p>
              </div>

              <div className="info-block">
                <span className="label">★ 媒体 / 商务合作</span>
                <h4>不是患者，找我们</h4>
                <p>媒体采访、品牌合作、研究机构对接，请发邮件至：</p>
                <p
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "var(--fs-md)",
                    marginTop: 8,
                    color: "var(--ink-900)",
                  }}
                >
                  business@jiutai-linyan.com
                </p>
              </div>

              <div className="info-block">
                <span className="label">★ 投诉与建议</span>
                <h4>觉得我们做得不够好</h4>
                <p>对运营人员的服务、对项目的安排有不满意，欢迎直接告诉我们。每条投诉都会被认真对待。</p>
                <p
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "var(--fs-md)",
                    marginTop: 8,
                    color: "var(--ink-900)",
                  }}
                >
                  complaint@jiutai-linyan.com
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 紧急情况 */}
      <div className="container">
        <div className="urgent">
          <div className="urgent__icon">!</div>
          <div>
            <h3>如出现严重不良反应，请立即拨打 120</h3>
            <p>
              请
              <strong style={{ color: "var(--lime)" }}>立即拨打 120</strong>
              ，并联系研究中心。
              <strong style={{ color: "var(--lime)" }}>本平台不提供急救服务</strong>
              ，遇紧急医疗状况请优先寻求专业急救与医疗帮助。
            </p>
          </div>
          <a href="tel:120" className="btn btn--primary btn--lg">
            立即拨打 120 <span className="arrow">→</span>
          </a>
        </div>
      </div>

      {/* 快速帮助 */}
      <section className="quick-help">
        <div className="container">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "end",
              flexWrap: "wrap",
              gap: 14,
            }}
          >
            <div>
              <span className="eyebrow">★ 也许你不需要联系我们</span>
              <h2 style={{ marginTop: 14 }}>
                这些<em>常见疑问</em>，
                <br />
                答案就在这里
              </h2>
            </div>
            <Link href="/about#faq" className="btn btn--ghost">
              看完整答疑 →
            </Link>
          </div>

          <div className="quick-help-grid">
            <Link href="/about#what" className="quick-link">
              <span className="quick-link__num">/ 01</span>
              <span className="quick-link__title">什么是临床试验？</span>
              <span className="quick-link__desc">5 分钟看懂"临床试验"到底是怎么回事，你能从中得到什么。</span>
            </Link>
            <Link href="/about#safety" className="quick-link">
              <span className="quick-link__num">/ 02</span>
              <span className="quick-link__title">参加试验安全吗？</span>
              <span className="quick-link__desc">国家药监局审批 + 医院伦理审查 + 全程监测。看看我们怎么守住你。</span>
            </Link>
            <Link href="/about#exit" className="quick-link">
              <span className="quick-link__num">/ 03</span>
              <span className="quick-link__title">能中途退出吗？</span>
              <span className="quick-link__desc">任何时候都可以。退出不会影响你以后在这家医院的就医。</span>
            </Link>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
