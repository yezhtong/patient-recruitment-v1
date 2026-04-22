"use client";

import { useActionState } from "react";
import { adminLogin, type AdminLoginState } from "@/lib/actions/admin-auth";

const initial: AdminLoginState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(adminLogin, initial);

  return (
    <form action={formAction} className="admin-form" style={{ gap: 14 }}>
      <div className="field">
        <label htmlFor="username">用户名</label>
        <input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          required
          autoFocus
        />
      </div>
      <div className="field">
        <label htmlFor="password">密码</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      {state.error ? <div className="error">{state.error}</div> : null}
      <button type="submit" className="btn-admin btn-admin--primary" disabled={pending}>
        {pending ? "登录中…" : "登录"}
      </button>
    </form>
  );
}
