"use client";

import { FormEvent, useRef } from "react";

export function ContactForm() {
  const formRef = useRef<HTMLFormElement | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    alert("已收到，我们会尽快联系你");
    formRef.current?.reset();
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate={false}>
      <div className="field-row">
        <div className="form-field">
          <label className="form-field__label" htmlFor="c-name">
            称呼 <span className="required">*</span>
          </label>
          <input
            className="input"
            id="c-name"
            name="name"
            type="text"
            autoComplete="name"
            placeholder="如：王女士"
            required
          />
        </div>
        <div className="form-field">
          <label className="form-field__label" htmlFor="c-phone">
            手机号 <span className="required">*</span>
          </label>
          <input
            className="input"
            id="c-phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="如：13800000000"
            pattern="1[3-9]\d{9}"
            required
          />
        </div>
      </div>

      <div className="form-field">
        <label className="form-field__label" htmlFor="c-topic">
          想咨询的方向 <span className="required">*</span>
        </label>
        <select className="select" id="c-topic" name="topic" required defaultValue="">
          <option value="" disabled>
            请选一个…
          </option>
          <option>想找具体某个病种的项目</option>
          <option>不确定自己适不适合参加</option>
          <option>已经报名了，想问进展</option>
          <option>对临床试验本身有疑问</option>
          <option>想退出已报名的项目</option>
          <option>媒体合作 / 其他咨询</option>
        </select>
      </div>

      <div className="form-field">
        <label className="form-field__label" htmlFor="c-message">
          留言内容 <span className="required">*</span>
        </label>
        <textarea
          className="textarea"
          id="c-message"
          name="message"
          rows={5}
          placeholder="多说几句你的情况，方便我们更好地帮你"
          required
          minLength={5}
        />
        <p className="form-field__hint">不知道怎么开口？告诉我们你的病种、所在城市、目前的治疗情况就够了。</p>
      </div>

      <div className="form-field">
        <label className="form-field__label">希望我们怎么联系你？</label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <label className="checkbox checkbox--checked">
            <input type="checkbox" name="contact-phone" defaultChecked />
            <span>电话</span>
          </label>
          <label className="checkbox">
            <input type="checkbox" name="contact-wechat" />
            <span>微信</span>
          </label>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "flex-start",
          margin: "8px 0 24px",
          fontSize: "var(--fs-sm)",
          color: "var(--gray-600)",
        }}
      >
        <input
          type="checkbox"
          id="c-agree"
          name="agree"
          required
          style={{ marginTop: 4, accentColor: "var(--accent)" }}
        />
        <label htmlFor="c-agree">
          我同意 <a href="#" style={{ textDecoration: "underline" }}>隐私政策</a>
          ，授权九泰临研团队联系我。
        </label>
      </div>

      <button type="submit" className="btn btn--primary btn--lg" style={{ width: "100%" }}>
        提交留言 <span className="arrow">→</span>
      </button>
      <p
        style={{
          marginTop: 16,
          textAlign: "center",
          fontFamily: "var(--font-mono)",
          fontSize: 11,
          letterSpacing: ".08em",
          textTransform: "uppercase",
          color: "var(--gray-500)",
        }}
      >
        ★ 工作日 9:00–18:00 · 周末邮件客服
      </p>
    </form>
  );
}
