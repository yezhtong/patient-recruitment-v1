"use client";

import { useActionState } from "react";
import Link from "next/link";
import { submitAppeal, type AppealFormState } from "./actions";

const INITIAL: AppealFormState = { status: "idle" };

export function AppealForm() {
  const [state, action, pending] = useActionState(submitAppeal, INITIAL);

  return (
    <form action={action} className="appeal-panel" noValidate>
      <div className="appeal-field">
        <label className="appeal-field__label" htmlFor="phoneSuffix">
          手机号后 4 位 <span className="req">*</span>
        </label>
        <p className="appeal-field__hint">用来确认是你本人操作。我们不会短信发送验证码。</p>
        <input
          id="phoneSuffix"
          name="phoneSuffix"
          type="text"
          inputMode="numeric"
          maxLength={4}
          placeholder="1234"
          className="appeal-input --phone"
          required
        />
      </div>

      <div className="appeal-field">
        <label className="appeal-field__label" htmlFor="appealText">
          申诉理由 <span className="req">*</span>
        </label>
        <p className="appeal-field__hint">
          例如：我是多发性硬化患者，最近在对比全国多地的试验方案，希望了解更多信息。
        </p>
        <textarea
          id="appealText"
          name="appealText"
          maxLength={200}
          minLength={5}
          className="appeal-textarea"
          placeholder="把你的情况说清楚（5-200 字）"
          required
        />
      </div>

      <div className="appeal-agree">
        <input type="checkbox" id="agreed" name="agreed" required />
        <label htmlFor="agreed">
          我已阅读并同意{" "}
          <Link href="/about">《用户服务协议》</Link>
          {" "}和{" "}
          <Link href="/about">《隐私政策》</Link>
          ，并确认以上陈述属实。
        </label>
      </div>

      {state.status === "error" ? (
        <p className="appeal-error" role="alert">
          ⚠ {state.message}
        </p>
      ) : null}

      <div className="appeal-submit" style={{ marginTop: 16 }}>
        <button
          type="submit"
          className="btn btn--primary btn--lg"
          disabled={pending}
        >
          {pending ? "提交中…" : "提交申诉"}
        </button>
        <Link href="/account-locked" className="btn btn--ghost btn--lg">
          取消，返回上一页
        </Link>
      </div>
    </form>
  );
}
