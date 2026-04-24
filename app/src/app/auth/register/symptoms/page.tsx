import { redirect } from "next/navigation";
import { getUserSession, isLoggedIn } from "@/lib/user-session";
import { SymptomsForm } from "./SymptomsForm";
import "./styles.css";

export const metadata = {
  title: "补充症状 · 九泰临研",
  description: "描述你的症状，AI 帮你匹配最合适的临床试验。",
};

export default async function RegisterSymptomsPage() {
  const session = await getUserSession();
  if (!isLoggedIn(session)) {
    redirect("/auth?next=/auth/register/symptoms");
  }

  return (
    <div className="sym-page">
      <header className="sym-topbar">
        <div className="sym-topbar__inner">
          <a href="/" className="sym-logo">
            九泰<em>临研</em>
          </a>
          <nav className="sym-stepper" aria-label="注册进度">
            <span className="sym-stepper__dot sym-stepper__dot--done" aria-label="步骤1已完成">1</span>
            <span className="sym-stepper__line sym-stepper__line--done" />
            <span className="sym-stepper__dot sym-stepper__dot--current" aria-label="步骤2当前">2</span>
            <span className="sym-stepper__line" />
            <span className="sym-stepper__dot" aria-label="步骤3待完成">3</span>
          </nav>
        </div>
      </header>

      <main className="sym-main" id="main-content">
        <div className="sym-wrap">
          <div className="sym-head">
            <p className="sym-head__eyebrow">注册 · 第 2 步</p>
            <h1>描述你最近的症状</h1>
            <p className="sym-head__sub">帮助我们为你推荐最合适的临床试验</p>
          </div>

          <div className="sym-notice">
            你的症状只用于匹配更合适的试验，严格保密，不对外分享，不构成医疗诊断。
          </div>

          <SymptomsForm />
        </div>
      </main>
    </div>
  );
}
