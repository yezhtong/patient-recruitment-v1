import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer__deco" aria-hidden="true">
        JIUTAI
      </div>
      <div className="container">
        <div className="site-footer__grid">
          <div className="site-footer__brand">
            <div className="brand" style={{ color: "var(--cream-50)" }}>
              <div className="brand__logo">JT</div>
              <span translate="no">九泰临研</span>
            </div>
            <p>九泰药械旗下临床试验患者招募平台，帮你找到适合自己的临床试验，全程陪伴。</p>
          </div>
          <div>
            <h5>找试验</h5>
            <ul>
              <li><Link href="/trials">看全部项目</Link></li>
              <li><Link href="/trials">按病种查找</Link></li>
              <li><Link href="/trials">按城市查找</Link></li>
              <li><Link href="/trials">医美相关</Link></li>
            </ul>
          </div>
          <div>
            <h5>了解更多</h5>
            <ul>
              <li><Link href="/about">什么是临床试验</Link></li>
              <li><Link href="/faq">常见问题</Link></li>
              <li><Link href="/community">病友社区</Link></li>
              <li><Link href="/me">我的报名</Link></li>
            </ul>
          </div>
          <div>
            <h5>关于我们</h5>
            <ul>
              <li><Link href="/about">关于九泰临研</Link></li>
              <li><Link href="/contact">联系方式</Link></li>
              <li><Link href="/privacy">隐私政策</Link></li>
              <li><Link href="/terms">用户协议</Link></li>
            </ul>
          </div>
        </div>
        <div className="site-footer__bottom">
          <span>© 2026 九泰药械（北京）有限公司</span>
          <span>本平台内容仅作信息提供，不能替代医生的专业建议</span>
        </div>
      </div>
    </footer>
  );
}
