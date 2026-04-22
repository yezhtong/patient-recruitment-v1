import Link from "next/link";
import { getUserSession, isLoggedIn } from "@/lib/user-session";
import { userLogout } from "@/lib/actions/user-auth";

type NavKey = "home" | "trials" | "community" | "me" | "about" | "contact";

interface Props {
  current?: NavKey;
}

const navItems: { key: NavKey; href: string; label: string }[] = [
  { key: "home", href: "/", label: "首页" },
  { key: "trials", href: "/trials", label: "找试验" },
  { key: "community", href: "/community", label: "病友社区" },
  { key: "me", href: "/me", label: "我的报名" },
  { key: "about", href: "/about", label: "了解更多" },
];

export async function SiteHeader({ current }: Props) {
  const session = await getUserSession();
  const loggedIn = isLoggedIn(session);

  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <Link className="brand" href="/">
          <div className="brand__logo">JT</div>
          <span translate="no">
            九泰<em style={{ fontStyle: "italic", color: "var(--accent)" }}>临研</em>
          </span>
        </Link>
        <nav className="nav" aria-label="主导航">
          {navItems.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              aria-current={current === item.key ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="site-header__cta">
          {loggedIn ? (
            <>
              <Link
                href="/me"
                className="btn btn--text"
                style={{ border: "none", fontSize: "var(--fs-sm)" }}
              >
                {session.displayName || session.phone.slice(0, 3) + "****" + session.phone.slice(7)}
              </Link>
              <form action={userLogout} style={{ display: "inline-flex" }}>
                <button
                  type="submit"
                  className="btn btn--text"
                  style={{ border: "none", fontSize: "var(--fs-sm)", color: "var(--gray-600)", cursor: "pointer", background: "transparent" }}
                >
                  退出
                </button>
              </form>
              <Link className="btn btn--ink btn--sm" href="/trials">
                继续找试验 <span className="arrow">→</span>
              </Link>
            </>
          ) : (
            <>
              <Link
                className="btn btn--text"
                href="/auth"
                style={{ border: "none", fontSize: "var(--fs-sm)" }}
              >
                登录
              </Link>
              <Link className="btn btn--ink btn--sm" href="/trials">
                开始找试验 <span className="arrow">→</span>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
