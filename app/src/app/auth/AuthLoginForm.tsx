"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition, type FormEvent } from "react";
import { sendSmsCode, verifySmsCode } from "@/lib/actions/user-auth";

export function AuthLoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [countdown, setCountdown] = useState(0);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  async function handleSendCode() {
    setError(null);
    setInfo(null);
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      setError("请输入正确的手机号");
      return;
    }
    startTransition(async () => {
      const res = await sendSmsCode(phone);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setCountdown(res.nextRetryInSec);
      setInfo("验证码已发送（开发环境请使用 123456）");
    });
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      setError("请输入正确的手机号");
      return;
    }
    if (!/^\d{6}$/.test(code)) {
      setError("请输入 6 位验证码");
      return;
    }
    startTransition(async () => {
      const res = await verifySmsCode(phone, code);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setInfo(res.isNew ? "已为你创建账号并登录" : "登录成功");
      const safeNext =
        next && next.startsWith("/") && !next.startsWith("//") ? next : "/me";
      router.push(safeNext);
      router.refresh();
    });
  }

  return (
    <>
      <div className="auth-shell">
        <aside className="auth-side">
          <div className="auth-side__deco" aria-hidden="true"></div>

          <div className="auth-side__body">
            <Link className="brand auth-side__brand" href="/" style={{ textDecoration: "none", color: "var(--cream-50)" }}>
              <div className="brand__logo" style={{ background: "var(--lime)", color: "var(--ink-900)" }}>JT</div>
              <span translate="no">九泰临研</span>
            </Link>

            <h2>
              登录后<br /><em>让招募更顺畅</em>
            </h2>
            <p className="auth-side__lead">2 分钟完成预筛，资料自动复用，运营 24 小时内主动联系你。</p>

            <div className="auth-side__benefits">
              <div className="auth-side__benefit">
                <span className="auth-side__benefit__num">/ 01</span>
                <span>基础资料一次填，多次复用</span>
              </div>
              <div className="auth-side__benefit">
                <span className="auth-side__benefit__num">/ 02</span>
                <span>查看你的全部报名记录</span>
              </div>
              <div className="auth-side__benefit">
                <span className="auth-side__benefit__num">/ 03</span>
                <span>随时查看运营跟进进度</span>
              </div>
            </div>
          </div>

          <div className="auth-side__foot">© 2026 九泰药械 · 你的信息严格脱敏与保密</div>
        </aside>

        <section className="auth-main">
          <div className="auth-form">
            <span className="eyebrow">★ 欢迎回来</span>
            <h1 style={{ marginTop: 14 }}>
              登录<br />
              <em style={{ color: "var(--accent)", fontStyle: "italic" }}>或注册</em>
            </h1>
            <p className="sub">使用手机号一键登录，首次登录将自动创建账户。</p>

            {error ? <div className="auth-alert auth-alert--error">{error}</div> : null}
            {info ? <div className="auth-alert auth-alert--info">{info}</div> : null}

            <form onSubmit={handleSubmit}>
              <div className="form-field">
                <label className="form-field__label" htmlFor="auth-phone">
                  手机号 <span className="required">*</span>
                </label>
                <input
                  className="input"
                  id="auth-phone"
                  name="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="如：13800000000"
                  pattern="1[3-9]\d{9}"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  aria-required="true"
                />
              </div>

              <div className="form-field">
                <label className="form-field__label" htmlFor="auth-otp">
                  短信验证码 <span className="required">*</span>
                </label>
                <div className="otp-row">
                  <input
                    className="input otp-input"
                    id="auth-otp"
                    name="code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="\d{6}"
                    maxLength={6}
                    placeholder="6 位数字"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                    required
                    aria-required="true"
                  />
                  <button
                    type="button"
                    className="btn btn--ghost"
                    onClick={handleSendCode}
                    disabled={countdown > 0 || pending}
                  >
                    {countdown > 0 ? `${countdown}s 后重发` : "获取验证码"}
                  </button>
                </div>
                <p className="form-field__hint">
                  开发环境：任意手机号 + 验证码 <strong>123456</strong> 即可登录。
                </p>
              </div>

              <div className="agreement">
                <input type="checkbox" id="agree" required />
                <label htmlFor="agree">
                  我已阅读并同意{" "}
                  <Link href="/about" style={{ textDecoration: "underline" }}>用户协议</Link>{" "}
                  与{" "}
                  <Link href="/about" style={{ textDecoration: "underline" }}>隐私政策</Link>。
                </label>
              </div>

              <button
                type="submit"
                className="btn btn--primary btn--lg"
                style={{ width: "100%" }}
                disabled={pending}
              >
                {pending ? "处理中…" : "登录 / 注册"} <span className="arrow">→</span>
              </button>
            </form>
          </div>
        </section>
      </div>
    </>
  );
}
