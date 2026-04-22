import { redirect } from "next/navigation";
import { getAdminSession, isAdminSession } from "@/lib/admin-session";
import { LoginForm } from "./LoginForm";

export const metadata = {
  title: "登录 · 九泰临研运营后台",
};

export default async function AdminLoginPage() {
  const session = await getAdminSession();
  if (isAdminSession(session)) redirect("/admin");

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>运营后台</h1>
        <p className="sub">请输入用户名与密码登录。</p>
        <LoginForm />
        <div className="dev-hint">
          开发环境默认账号：<strong>admin</strong> / <strong>admin123</strong>
        </div>
      </div>
    </div>
  );
}
