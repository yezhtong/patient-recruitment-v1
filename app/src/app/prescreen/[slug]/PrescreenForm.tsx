"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { submitLead } from "@/lib/actions/prescreen";

interface Prefill {
  name?: string;
  phone?: string;
  gender?: string;
  age?: number;
  city?: string;
}

interface Props {
  slug: string;
  title: string;
  disease: string;
  phase: string | null;
  city: string;
  prefill?: Prefill;
}

function collectProjectAnswers(form: HTMLFormElement): Record<string, unknown> {
  const projectKeys = ["diag", "t", "weight", "allergy", "site"];
  const treatmentValues: string[] = [];
  for (const el of form.querySelectorAll<HTMLInputElement>(
    'input[name="tx"]:checked',
  )) {
    treatmentValues.push(el.value);
  }
  const fd = new FormData(form);
  const answers: Record<string, unknown> = {};
  for (const key of projectKeys) {
    const v = fd.get(key);
    if (typeof v === "string" && v.length > 0) answers[key] = v;
  }
  if (treatmentValues.length) answers.tx = treatmentValues;
  return answers;
}

export function PrescreenForm({ slug, title, disease, phase, city, prefill }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    setError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const agreePrivacy = fd.get("agree") === "on";
    if (!agreePrivacy) {
      setError("请先勾选同意隐私政策与用户协议");
      return;
    }
    const payload = {
      trialSlug: slug,
      name: String(fd.get("name") ?? "").trim(),
      phone: String(fd.get("phone") ?? "").trim(),
      gender: (fd.get("gender") as "male" | "female") || undefined,
      age: fd.get("age") ? Number(fd.get("age")) : undefined,
      city: String(fd.get("city") ?? "").trim() || undefined,
      condition: String(fd.get("condition") ?? "").trim() || undefined,
      projectAnswers: collectProjectAnswers(form),
      agreePrivacy,
      agreeReuse: fd.get("reuse") === "on",
      sourcePage: `/prescreen/${slug}`,
    };

    startTransition(async () => {
      try {
        const result = await submitLead(payload);
        if (!result.ok) {
          if (result.error === "NOT_AUTHENTICATED") {
            setError("登录已过期，请重新登录");
            router.push(`/auth?next=${encodeURIComponent(pathname ?? `/prescreen/${slug}`)}`);
            return;
          }
          setError(result.error);
          return;
        }
        router.push(
          `/prescreen/success?slug=${encodeURIComponent(slug)}&leadId=${encodeURIComponent(result.leadId)}`,
        );
      } catch {
        setError("提交失败，请稍后再试");
      }
    });
  }

  return (
    <div className="form-shell" style={{ padding: "32px 0 96px", background: "var(--cream-100)" }}>
      <div className="container" style={{ maxWidth: 1100 }}>
        <div style={{ marginBottom: 32 }}>
          <Link href={`/trials/${slug}`} className="btn btn--text" style={{ fontSize: "var(--fs-sm)" }}>
            ← 返回项目详情
          </Link>
          <h1 style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(36px,5vw,56px)", fontWeight: 400, letterSpacing: "-.02em", marginTop: 14 }}>
            预筛 <em style={{ color: "var(--accent)", fontStyle: "italic" }}>/ 申请</em>
          </h1>
          <p className="muted mt-3" style={{ fontFamily: "var(--font-mono)", fontSize: "var(--fs-xs)", letterSpacing: ".08em", textTransform: "uppercase" }}>
            {title}
          </p>
        </div>

        <div>
          <div
            className="form-progress"
            role="progressbar"
            aria-valuenow={2}
            aria-valuemin={1}
            aria-valuemax={3}
            aria-label="预筛进度：第 2 步，共 3 步"
            style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 32 }}
          >
            <div className="form-progress__item done" style={{ height: 4, background: "var(--ink-900)", borderRadius: 2 }}></div>
            <div className="form-progress__item active" style={{ height: 4, background: "var(--accent)", borderRadius: 2 }}></div>
            <div className="form-progress__item" style={{ height: 4, background: "var(--ink-200)", borderRadius: 2 }}></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 48 }}>
            <span className="form-progress__label" style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--ink-900)" }}>/ 01 基础资料</span>
            <span className="form-progress__label" style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--ink-900)" }}>/ 02 项目相关</span>
            <span className="form-progress__label" style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--gray-500)" }}>/ 03 信息确认</span>
          </div>
        </div>

        <div className="layout-form" style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 32, alignItems: "start" }}>
          <form onSubmit={handleSubmit}>
            <section className="form-card" style={{ background: "var(--cream-0)", border: "var(--border)", borderRadius: "var(--r-2xl)", padding: "40px 44px", marginBottom: 18 }}>
              <div className="form-card__title" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14, marginBottom: 8, flexWrap: "wrap" }}>
                <h3 style={{ fontFamily: "var(--font-serif)", fontSize: 36, fontWeight: 400, letterSpacing: "-.01em", display: "flex", alignItems: "baseline", gap: 14 }}>
                  <span className="num" style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--accent)", letterSpacing: ".12em", fontWeight: 500 }}>/ 01</span> 基础资料
                </h3>
                <Link href="/me" className="btn btn--text" style={{ fontSize: "var(--fs-sm)" }}>前往个人中心修改 →</Link>
              </div>
              <div className="prefill-banner" style={{ display: "flex", gap: 12, padding: "14px 18px", background: "var(--lime-soft)", border: "1px solid var(--lime)", borderRadius: "var(--r-md)", color: "var(--ink-900)", fontSize: "var(--fs-sm)", marginBottom: 28, alignItems: "center" }}>
                <span style={{ fontSize: 18 }}>✦</span>
                <span>填写真实信息，运营会通过此手机号联系你。</span>
              </div>

              <div className="field-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div className="form-field">
                  <label className="form-field__label" htmlFor="name">姓名 <span className="required">*</span></label>
                  <input
                    className="input"
                    id="name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    placeholder="请输入真实姓名"
                    required
                    aria-required="true"
                    defaultValue={prefill?.name ?? ""}
                    readOnly={Boolean(prefill?.name)}
                    style={prefill?.name ? { background: "var(--cream-100)", color: "var(--ink-600)" } : undefined}
                  />
                  {prefill?.name ? (
                    <p className="form-field__hint" style={{ color: "var(--accent)" }}>已从账号自动带入</p>
                  ) : null}
                </div>
                <div className="form-field">
                  <label className="form-field__label" htmlFor="phone">手机号 <span className="required">*</span></label>
                  <input
                    className="input"
                    id="phone"
                    name="phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="如：13800000000"
                    pattern="^1[3-9]\d{9}$"
                    required
                    aria-required="true"
                    defaultValue={prefill?.phone ?? ""}
                    readOnly={Boolean(prefill?.phone)}
                    style={prefill?.phone ? { background: "var(--cream-100)", color: "var(--ink-600)" } : undefined}
                  />
                  {prefill?.phone ? (
                    <p className="form-field__hint" style={{ color: "var(--accent)" }}>已从账号自动带入</p>
                  ) : (
                    <p className="form-field__hint">仅运营人员可见，用于联系你</p>
                  )}
                </div>
              </div>

              <div className="field-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div className="form-field">
                  <label className="form-field__label" htmlFor="gender">性别</label>
                  <select className="select" id="gender" name="gender" autoComplete="sex" defaultValue={prefill?.gender ?? ""}>
                    <option value="">不填</option>
                    <option value="female">女</option>
                    <option value="male">男</option>
                  </select>
                </div>
                <div className="form-field">
                  <label className="form-field__label" htmlFor="age">年龄</label>
                  <input
                    className="input"
                    id="age"
                    name="age"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={120}
                    placeholder="如：45"
                    defaultValue={prefill?.age ?? ""}
                  />
                </div>
              </div>

              <div className="field-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div className="form-field">
                  <label className="form-field__label" htmlFor="city">所在城市</label>
                  <input
                    className="input"
                    id="city"
                    name="city"
                    type="text"
                    autoComplete="address-level2"
                    defaultValue={prefill?.city ?? city}
                  />
                </div>
                <div className="form-field">
                  <label className="form-field__label" htmlFor="condition">主要病种</label>
                  <input className="input" id="condition" name="condition" type="text" defaultValue={disease} />
                </div>
              </div>
            </section>

            <section className="form-card" style={{ background: "var(--cream-0)", border: "var(--border)", borderRadius: "var(--r-2xl)", padding: "40px 44px", marginBottom: 18 }}>
              <div className="form-card__title" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14, marginBottom: 8, flexWrap: "wrap" }}>
                <h3 style={{ fontFamily: "var(--font-serif)", fontSize: 36, fontWeight: 400, letterSpacing: "-.01em", display: "flex", alignItems: "baseline", gap: 14 }}>
                  <span className="num" style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--accent)", letterSpacing: ".12em", fontWeight: 500 }}>/ 02</span> 项目相关问题
                </h3>
                <span className="badge badge--accent">本项目专属</span>
              </div>
              <p className="form-card__sub" style={{ color: "var(--gray-500)", fontSize: "var(--fs-md)", marginBottom: 32 }}>
                这些问题用于初步判断你是否适合本项目，预计 1 分钟完成。
              </p>

              <div className="form-field">
                <label className="form-field__label">你是否已经被医生确诊为 {disease}？</label>
                <div className="radio-group" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8 }}>
                  <label className="radio"><input type="radio" name="diag" value="yes" /><span>是的，已经确诊</span></label>
                  <label className="radio"><input type="radio" name="diag" value="unsure" /><span>不确定</span></label>
                  <label className="radio"><input type="radio" name="diag" value="no" /><span>否</span></label>
                </div>
              </div>

              <div className="form-field">
                <label className="form-field__label">确诊距今的时间</label>
                <div className="radio-group" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8 }}>
                  <label className="radio"><input type="radio" name="t" value="lt3" /><span>3 个月内</span></label>
                  <label className="radio"><input type="radio" name="t" value="3-6" /><span>3 - 6 个月</span></label>
                  <label className="radio"><input type="radio" name="t" value="6-12" /><span>6 - 12 个月</span></label>
                  <label className="radio"><input type="radio" name="t" value="gt12" /><span>12 个月以上</span></label>
                </div>
              </div>

              <div className="form-field">
                <label className="form-field__label">是否已经接受过以下治疗？（可多选）</label>
                <div className="checkbox-group" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8 }}>
                  <label className="checkbox"><input type="checkbox" name="tx" value="surgery" /><span>手术治疗</span></label>
                  <label className="checkbox"><input type="checkbox" name="tx" value="radio" /><span>放疗</span></label>
                  <label className="checkbox"><input type="checkbox" name="tx" value="chemo" /><span>化疗</span></label>
                  <label className="checkbox"><input type="checkbox" name="tx" value="targeted" /><span>靶向治疗</span></label>
                  <label className="checkbox"><input type="checkbox" name="tx" value="endo" /><span>内分泌治疗</span></label>
                  <label className="checkbox"><input type="checkbox" name="tx" value="none" /><span>暂未治疗</span></label>
                </div>
              </div>

              <div className="form-field">
                <label className="form-field__label" htmlFor="weight">最近一次体检的体重（kg）</label>
                <input className="input" id="weight" name="weight" type="number" inputMode="numeric" min={30} max={200} placeholder="如：55" />
                <p className="form-field__hint">用于评估用药剂量</p>
              </div>

              <div className="form-field">
                <label className="form-field__label" htmlFor="allergy">是否对任何药物过敏？</label>
                <textarea className="textarea" id="allergy" name="allergy" placeholder="如：曾经使用 XX 药物后出现皮疹…" />
                <p className="form-field__hint">没有可不填</p>
              </div>

              <div className="form-field">
                <label className="form-field__label">期望就诊的研究中心</label>
                <div className="radio-group" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8 }}>
                  <label className="radio"><input type="radio" name="site" value="primary" /><span>本项目推荐中心</span></label>
                  <label className="radio"><input type="radio" name="site" value="ops" /><span>由运营推荐</span></label>
                </div>
              </div>
            </section>

            <section className="form-card" style={{ background: "var(--cream-0)", border: "var(--border)", borderRadius: "var(--r-2xl)", padding: "40px 44px", marginBottom: 18 }}>
              <div className="form-card__title" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14, marginBottom: 8, flexWrap: "wrap" }}>
                <h3 style={{ fontFamily: "var(--font-serif)", fontSize: 36, fontWeight: 400, letterSpacing: "-.01em", display: "flex", alignItems: "baseline", gap: 14 }}>
                  <span className="num" style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--accent)", letterSpacing: ".12em", fontWeight: 500 }}>/ 03</span> 信息确认
                </h3>
              </div>
              <label className="checkbox" style={{ border: "1px solid var(--ink-200)", marginBottom: 8 }}>
                <input type="checkbox" name="agree" required aria-required="true" />
                <span>
                  我已阅读并同意 <a href="#" style={{ textDecoration: "underline" }}>隐私政策</a> 与 <a href="#" style={{ textDecoration: "underline" }}>用户协议</a>，授权平台将我的预筛资料发送给本项目研究中心。
                </span>
              </label>
              <label className="checkbox" style={{ border: "1px solid var(--ink-200)" }}>
                <input type="checkbox" name="reuse" />
                <span>同意将我的基础资料保留以便复用到其他项目预筛。</span>
              </label>
            </section>

            {error ? (
              <div
                role="alert"
                style={{
                  background: "var(--danger-50)",
                  border: "1px solid var(--danger-500)",
                  color: "var(--danger-700)",
                  borderRadius: "var(--r-md)",
                  padding: "14px 18px",
                  marginBottom: 14,
                  fontSize: "var(--fs-sm)",
                }}
              >
                {error}
              </div>
            ) : null}

            <div className="submit-bar" style={{ background: "var(--cream-0)", border: "var(--border)", borderRadius: "var(--r-2xl)", padding: "22px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14, marginTop: 18 }}>
              <span className="submit-bar__hint" style={{ color: "var(--gray-600)", fontSize: "var(--fs-sm)", fontFamily: "var(--font-mono)", letterSpacing: ".04em", textTransform: "uppercase" }}>
                ★ 提交后，运营会在 24 小时内联系你
              </span>
              <div style={{ display: "flex", gap: 10 }}>
                <button type="submit" className="btn btn--primary btn--lg" disabled={pending}>
                  {pending ? "提交中…" : "提交预筛"} <span className="arrow">→</span>
                </button>
              </div>
            </div>
          </form>

          <aside>
            <div className="form-summary" style={{ background: "var(--ink-900)", color: "var(--cream-50)", borderRadius: "var(--r-2xl)", padding: 28, position: "sticky", top: 100 }}>
              <span className="eyebrow" style={{ color: "var(--lime)" }}>★ 项目快览</span>
              <h4 style={{ color: "var(--cream-50)", fontFamily: "var(--font-serif)", fontSize: 24, fontWeight: 400, marginTop: 12, marginBottom: 18 }}>
                {disease}
                <br />
                <em style={{ color: "var(--lime)", fontStyle: "italic" }}>{title.length > 16 ? `${title.slice(0, 16)}…` : title}</em>
              </h4>
              <div style={{ marginTop: 24 }}>
                <div className="form-summary__item" style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderTop: "1px solid rgba(253,250,243,.15)", fontSize: "var(--fs-sm)" }}>
                  <span style={{ color: "rgba(253,250,243,.6)", fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase" }}>项目类型</span>
                  <span style={{ color: "var(--cream-50)", fontWeight: 500 }}>{phase ? `${phase} 期` : "—"}</span>
                </div>
                <div className="form-summary__item" style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderTop: "1px solid rgba(253,250,243,.15)", fontSize: "var(--fs-sm)" }}>
                  <span style={{ color: "rgba(253,250,243,.6)", fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase" }}>就诊城市</span>
                  <span style={{ color: "var(--cream-50)", fontWeight: 500 }}>{city}</span>
                </div>
                <div className="form-summary__item" style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderTop: "1px solid rgba(253,250,243,.15)", fontSize: "var(--fs-sm)" }}>
                  <span style={{ color: "rgba(253,250,243,.6)", fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase" }}>研究用药</span>
                  <span style={{ color: "var(--lime)", fontWeight: 500 }}>免费</span>
                </div>
              </div>

              <div style={{ marginTop: 24, padding: 14, background: "rgba(200,255,74,.08)", borderRadius: 10, fontSize: "var(--fs-xs)", color: "var(--lime)", fontFamily: "var(--font-mono)", letterSpacing: ".04em", lineHeight: 1.5 }}>
                🔒 你的个人信息会经过严格脱敏，仅运营与研究中心可见。
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
