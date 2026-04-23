"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState, useTransition, type FormEvent } from "react";
import { submitLead } from "@/lib/actions/prescreen";

/**
 * M8.2 T6 · 动态预筛表单
 *
 * 从 `TrialPrescreenForm.items` 的 schema 渲染，支持：
 * - 题型：single / multi / text / textarea / number / date / agree
 * - 必填、默认值、数值范围、正则、错误文案
 * - 跳题（showWhen）：客户端实时求值
 *
 * 提交后调用 `submitLead`（M2 既有 action），answers 走 `projectAnswers` 字段。
 */

interface ItemDTO {
  id: string;
  fieldKey: string;
  label: string;
  helpText: string | null;
  fieldType: "single" | "multi" | "text" | "textarea" | "number" | "date" | "agree";
  options: Array<{ value: string; label: string }> | null; // 已解析
  placeholder: string | null;
  defaultValue: unknown;
  isRequired: boolean;
  minValue: number | null;
  maxValue: number | null;
  regex: string | null;
  errorMessage: string | null;
  showWhen: { fieldKey: string; op: "eq" | "neq" | "in" | "notIn"; value: unknown } | null;
  sortOrder: number;
}

interface Props {
  slug: string;
  title: string;
  disease: string;
  phase: string | null;
  city: string;
  prefill?: {
    name?: string;
    phone?: string;
    gender?: string;
    age?: number;
    city?: string;
  };
  formTitle: string | null;
  formDescription: string | null;
  items: ItemDTO[];
}

type AnswerValue = string | string[] | boolean | number | null;

function evalShowWhen(
  rule: ItemDTO["showWhen"],
  answers: Record<string, AnswerValue>,
): boolean {
  if (!rule) return true;
  const cur = answers[rule.fieldKey];
  const expected = rule.value;
  switch (rule.op) {
    case "eq":
      return cur === expected;
    case "neq":
      return cur !== expected;
    case "in":
      return Array.isArray(expected) && expected.includes(cur as string);
    case "notIn":
      return Array.isArray(expected) && !expected.includes(cur as string);
    default:
      return true;
  }
}

function validateItem(item: ItemDTO, value: AnswerValue): string | null {
  if (item.isRequired) {
    if (value === null || value === undefined || value === "" ||
        (Array.isArray(value) && value.length === 0) ||
        (item.fieldType === "agree" && value !== true)) {
      return item.errorMessage ?? `"${item.label}" 为必填项`;
    }
  }
  if (item.fieldType === "number" && typeof value === "number" && !Number.isNaN(value)) {
    if (item.minValue !== null && value < item.minValue) {
      return item.errorMessage ?? `${item.label} 不能小于 ${item.minValue}`;
    }
    if (item.maxValue !== null && value > item.maxValue) {
      return item.errorMessage ?? `${item.label} 不能大于 ${item.maxValue}`;
    }
  }
  if ((item.fieldType === "text" || item.fieldType === "textarea") && typeof value === "string" && item.regex) {
    try {
      if (!new RegExp(item.regex).test(value)) {
        return item.errorMessage ?? `${item.label} 格式不正确`;
      }
    } catch {
      // 忽略无效正则
    }
  }
  return null;
}

export function DynamicPrescreenForm({
  slug,
  title,
  disease,
  phase,
  city,
  prefill,
  formTitle,
  formDescription,
  items,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // 初始值：item.defaultValue（如果有）
  const initialAnswers = useMemo<Record<string, AnswerValue>>(() => {
    const acc: Record<string, AnswerValue> = {};
    for (const it of items) {
      if (it.defaultValue !== null && it.defaultValue !== undefined) {
        acc[it.fieldKey] = it.defaultValue as AnswerValue;
      } else if (it.fieldType === "multi") {
        acc[it.fieldKey] = [];
      } else if (it.fieldType === "agree") {
        acc[it.fieldKey] = false;
      } else {
        acc[it.fieldKey] = "";
      }
    }
    return acc;
  }, [items]);

  const [answers, setAnswers] = useState<Record<string, AnswerValue>>(initialAnswers);

  // 哪些字段当前可见（跳题求值）
  const visibleItems = useMemo(
    () => items.filter((it) => evalShowWhen(it.showWhen, answers)),
    [items, answers],
  );

  function setAnswer(key: string, v: AnswerValue) {
    setAnswers((prev) => ({ ...prev, [key]: v }));
  }

  function toggleMulti(key: string, value: string) {
    const cur = (answers[key] as string[]) ?? [];
    if (cur.includes(value)) {
      setAnswer(key, cur.filter((v) => v !== value));
    } else {
      setAnswer(key, [...cur, value]);
    }
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    setError(null);

    // 校验可见字段
    for (const it of visibleItems) {
      const err = validateItem(it, answers[it.fieldKey]);
      if (err) {
        setError(err);
        return;
      }
    }

    const form = e.currentTarget;
    const fd = new FormData(form);
    const agreePrivacy = fd.get("agree") === "on";
    if (!agreePrivacy) {
      setError("请先勾选同意隐私政策与用户协议");
      return;
    }

    // 汇总 answers 里的项目问题（仅可见字段）
    const projectAnswers: Record<string, unknown> = {};
    for (const it of visibleItems) {
      const v = answers[it.fieldKey];
      if (v === null || v === undefined || v === "") continue;
      if (Array.isArray(v) && v.length === 0) continue;
      projectAnswers[it.fieldKey] = v;
    }

    const payload = {
      trialSlug: slug,
      name: String(fd.get("name") ?? "").trim(),
      phone: String(fd.get("phone") ?? "").trim(),
      gender: (fd.get("gender") as "male" | "female") || undefined,
      age: fd.get("age") ? Number(fd.get("age")) : undefined,
      city: String(fd.get("city") ?? "").trim() || undefined,
      condition: String(fd.get("condition") ?? "").trim() || undefined,
      projectAnswers,
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

  function renderItem(item: ItemDTO) {
    const value = answers[item.fieldKey];

    const labelEl = (
      <label className="form-field__label" htmlFor={`it-${item.id}`}>
        {item.label}
        {item.isRequired ? <span className="required"> *</span> : null}
      </label>
    );
    const hintEl = item.helpText ? (
      <p className="form-field__hint">{item.helpText}</p>
    ) : null;

    switch (item.fieldType) {
      case "number":
        return (
          <div className="form-field" key={item.id}>
            {labelEl}
            {hintEl}
            <input
              id={`it-${item.id}`}
              className="input"
              type="number"
              inputMode="numeric"
              placeholder={item.placeholder ?? ""}
              min={item.minValue ?? undefined}
              max={item.maxValue ?? undefined}
              value={value === "" || value === null ? "" : String(value)}
              onChange={(e) =>
                setAnswer(item.fieldKey, e.target.value === "" ? "" : Number(e.target.value))
              }
            />
          </div>
        );

      case "text":
        return (
          <div className="form-field" key={item.id}>
            {labelEl}
            {hintEl}
            <input
              id={`it-${item.id}`}
              className="input"
              type="text"
              placeholder={item.placeholder ?? ""}
              value={typeof value === "string" ? value : ""}
              onChange={(e) => setAnswer(item.fieldKey, e.target.value)}
            />
          </div>
        );

      case "textarea":
        return (
          <div className="form-field" key={item.id}>
            {labelEl}
            {hintEl}
            <textarea
              id={`it-${item.id}`}
              className="textarea"
              placeholder={item.placeholder ?? ""}
              value={typeof value === "string" ? value : ""}
              onChange={(e) => setAnswer(item.fieldKey, e.target.value)}
            />
          </div>
        );

      case "date":
        return (
          <div className="form-field" key={item.id}>
            {labelEl}
            {hintEl}
            <input
              id={`it-${item.id}`}
              className="input"
              type="date"
              value={typeof value === "string" ? value : ""}
              onChange={(e) => setAnswer(item.fieldKey, e.target.value)}
            />
          </div>
        );

      case "single":
        return (
          <div className="form-field" key={item.id}>
            {labelEl}
            {hintEl}
            <div
              className="radio-group"
              role="radiogroup"
              aria-labelledby={`it-${item.id}-label`}
              style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8 }}
            >
              {(item.options ?? []).map((opt) => (
                <label key={opt.value} className="radio">
                  <input
                    type="radio"
                    name={item.fieldKey}
                    value={opt.value}
                    checked={value === opt.value}
                    onChange={() => setAnswer(item.fieldKey, opt.value)}
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          </div>
        );

      case "multi":
        return (
          <div className="form-field" key={item.id}>
            {labelEl}
            {hintEl}
            <div
              className="checkbox-group"
              style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8 }}
            >
              {(item.options ?? []).map((opt) => {
                const arr = Array.isArray(value) ? (value as string[]) : [];
                return (
                  <label key={opt.value} className="checkbox">
                    <input
                      type="checkbox"
                      checked={arr.includes(opt.value)}
                      onChange={() => toggleMulti(item.fieldKey, opt.value)}
                    />
                    <span>{opt.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        );

      case "agree":
        return (
          <div className="form-field" key={item.id}>
            <label className="checkbox" style={{ border: "1px solid var(--ink-200)" }}>
              <input
                type="checkbox"
                checked={value === true}
                onChange={(e) => setAnswer(item.fieldKey, e.target.checked)}
              />
              <span>
                {item.label}
                {item.isRequired ? <span className="required"> *</span> : null}
              </span>
            </label>
            {hintEl}
          </div>
        );

      default:
        return null;
    }
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

        <div className="layout-form" style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 32, alignItems: "start" }}>
          <form onSubmit={handleSubmit}>
            {/* 第一段：基础资料（姓名/手机/性别/年龄/城市/病种），与 fallback PrescreenForm 保持一致 */}
            <section className="form-card" style={{ background: "var(--cream-0)", border: "var(--border)", borderRadius: "var(--r-2xl)", padding: "40px 44px", marginBottom: 18 }}>
              <h3 style={{ fontFamily: "var(--font-serif)", fontSize: 36, fontWeight: 400, letterSpacing: "-.01em", display: "flex", alignItems: "baseline", gap: 14, marginBottom: 20 }}>
                <span className="num" style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--accent)", letterSpacing: ".12em", fontWeight: 500 }}>/ 01</span> 基础资料
              </h3>
              <div className="prefill-banner" style={{ display: "flex", gap: 12, padding: "14px 18px", background: "var(--lime-soft)", border: "1px solid var(--lime)", borderRadius: "var(--r-md)", color: "var(--ink-900)", fontSize: "var(--fs-sm)", marginBottom: 28, alignItems: "center" }}>
                <span style={{ fontSize: 18 }}>✦</span>
                <span>填写真实信息，运营会通过此手机号联系你。</span>
              </div>

              <div className="field-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div className="form-field">
                  <label className="form-field__label" htmlFor="name">姓名 <span className="required">*</span></label>
                  <input className="input" id="name" name="name" type="text" autoComplete="name" required defaultValue={prefill?.name ?? ""} readOnly={Boolean(prefill?.name)} style={prefill?.name ? { background: "var(--cream-100)", color: "var(--ink-600)" } : undefined} />
                </div>
                <div className="form-field">
                  <label className="form-field__label" htmlFor="phone">手机号 <span className="required">*</span></label>
                  <input className="input" id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" required pattern="^1[3-9]\d{9}$" defaultValue={prefill?.phone ?? ""} readOnly={Boolean(prefill?.phone)} style={prefill?.phone ? { background: "var(--cream-100)", color: "var(--ink-600)" } : undefined} />
                </div>
              </div>
              <div className="field-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div className="form-field">
                  <label className="form-field__label" htmlFor="gender">性别</label>
                  <select className="select" id="gender" name="gender" defaultValue={prefill?.gender ?? ""}>
                    <option value="">不填</option>
                    <option value="female">女</option>
                    <option value="male">男</option>
                  </select>
                </div>
                <div className="form-field">
                  <label className="form-field__label" htmlFor="age">年龄</label>
                  <input className="input" id="age" name="age" type="number" inputMode="numeric" min={1} max={120} defaultValue={prefill?.age ?? ""} />
                </div>
              </div>
              <div className="field-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div className="form-field">
                  <label className="form-field__label" htmlFor="city">所在城市</label>
                  <input className="input" id="city" name="city" type="text" autoComplete="address-level2" defaultValue={prefill?.city ?? city} />
                </div>
                <div className="form-field">
                  <label className="form-field__label" htmlFor="condition">主要病种</label>
                  <input className="input" id="condition" name="condition" type="text" defaultValue={disease} />
                </div>
              </div>
            </section>

            {/* 第二段：项目专属（动态渲染 items） */}
            <section className="form-card" style={{ background: "var(--cream-0)", border: "var(--border)", borderRadius: "var(--r-2xl)", padding: "40px 44px", marginBottom: 18 }}>
              <div className="form-card__title" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14, marginBottom: 8, flexWrap: "wrap" }}>
                <h3 style={{ fontFamily: "var(--font-serif)", fontSize: 36, fontWeight: 400, letterSpacing: "-.01em", display: "flex", alignItems: "baseline", gap: 14 }}>
                  <span className="num" style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--accent)", letterSpacing: ".12em", fontWeight: 500 }}>/ 02</span>{" "}
                  {formTitle ?? "项目相关问题"}
                </h3>
                <span className="badge badge--accent">本项目专属</span>
              </div>
              {formDescription ? (
                <p className="form-card__sub" style={{ color: "var(--gray-500)", fontSize: "var(--fs-md)", marginBottom: 32 }}>
                  {formDescription}
                </p>
              ) : null}

              {visibleItems.length === 0 ? (
                <p className="muted">本项目暂无额外问题。</p>
              ) : (
                visibleItems.map(renderItem)
              )}
            </section>

            {/* 第三段：信息确认（同意勾选） */}
            <section className="form-card" style={{ background: "var(--cream-0)", border: "var(--border)", borderRadius: "var(--r-2xl)", padding: "40px 44px", marginBottom: 18 }}>
              <h3 style={{ fontFamily: "var(--font-serif)", fontSize: 36, fontWeight: 400, letterSpacing: "-.01em", display: "flex", alignItems: "baseline", gap: 14, marginBottom: 16 }}>
                <span className="num" style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--accent)", letterSpacing: ".12em", fontWeight: 500 }}>/ 03</span> 信息确认
              </h3>
              <label className="checkbox" style={{ border: "1px solid var(--ink-200)", marginBottom: 8 }}>
                <input type="checkbox" name="agree" required aria-required="true" />
                <span>我已阅读并同意 <a href="#" style={{ textDecoration: "underline" }}>隐私政策</a> 与 <a href="#" style={{ textDecoration: "underline" }}>用户协议</a>，授权平台将我的预筛资料发送给本项目研究中心。</span>
              </label>
              <label className="checkbox" style={{ border: "1px solid var(--ink-200)" }}>
                <input type="checkbox" name="reuse" />
                <span>同意将我的基础资料保留以便复用到其他项目预筛。</span>
              </label>
            </section>

            {error ? (
              <div role="alert" style={{ background: "var(--danger-50)", border: "1px solid var(--danger-500)", color: "var(--danger-700)", borderRadius: "var(--r-md)", padding: "14px 18px", marginBottom: 14, fontSize: "var(--fs-sm)" }}>
                {error}
              </div>
            ) : null}

            <div className="submit-bar" style={{ background: "var(--cream-0)", border: "var(--border)", borderRadius: "var(--r-2xl)", padding: "22px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14, marginTop: 18 }}>
              <span className="submit-bar__hint" style={{ color: "var(--gray-600)", fontSize: "var(--fs-sm)", fontFamily: "var(--font-mono)", letterSpacing: ".04em", textTransform: "uppercase" }}>
                ★ 提交后，运营会在 24 小时内联系你
              </span>
              <button type="submit" className="btn btn--primary btn--lg" disabled={pending}>
                {pending ? "提交中…" : "提交预筛"} <span className="arrow">→</span>
              </button>
            </div>
          </form>

          <aside>
            <div className="form-summary" style={{ background: "var(--ink-900)", color: "var(--cream-50)", borderRadius: "var(--r-2xl)", padding: 28, position: "sticky", top: 100 }}>
              <span className="eyebrow" style={{ color: "var(--lime)" }}>★ 项目快览</span>
              <h4 style={{ color: "var(--cream-50)", fontFamily: "var(--font-serif)", fontSize: 24, fontWeight: 400, marginTop: 12, marginBottom: 18 }}>
                {disease}<br/>
                <em style={{ color: "var(--lime)", fontStyle: "italic" }}>{title.length > 16 ? `${title.slice(0, 16)}…` : title}</em>
              </h4>
              <div style={{ marginTop: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderTop: "1px solid rgba(253,250,243,.15)", fontSize: "var(--fs-sm)" }}>
                  <span style={{ color: "rgba(253,250,243,.6)", fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase" }}>项目类型</span>
                  <span style={{ color: "var(--cream-50)", fontWeight: 500 }}>{phase ? `${phase} 期` : "—"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderTop: "1px solid rgba(253,250,243,.15)", fontSize: "var(--fs-sm)" }}>
                  <span style={{ color: "rgba(253,250,243,.6)", fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase" }}>就诊城市</span>
                  <span style={{ color: "var(--cream-50)", fontWeight: 500 }}>{city}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderTop: "1px solid rgba(253,250,243,.15)", fontSize: "var(--fs-sm)" }}>
                  <span style={{ color: "rgba(253,250,243,.6)", fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase" }}>研究用药</span>
                  <span style={{ color: "var(--lime)", fontWeight: 500 }}>免费</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderTop: "1px solid rgba(253,250,243,.15)", fontSize: "var(--fs-sm)" }}>
                  <span style={{ color: "rgba(253,250,243,.6)", fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase" }}>问题数</span>
                  <span style={{ color: "var(--cream-50)", fontWeight: 500 }}>{visibleItems.length} / {items.length}</span>
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
