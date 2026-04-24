import { redirect } from "next/navigation";
import { SiteShell } from "@/components/SiteShell";
import { getUserSession, isLoggedIn } from "@/lib/user-session";
import { ChatClient } from "./ChatClient";
import "./styles.css";

export const metadata = {
  title: "匹配助手 · 九泰临研",
  description: "描述你的主要不适，AI 助手帮你匹配可参加的临床试验。不是诊断，仅供参考。",
};

export default async function MatchAssistantPage() {
  const session = await getUserSession();
  if (!isLoggedIn(session)) {
    redirect("/auth?next=/match-assistant");
  }

  return (
    <SiteShell current="me" hideFooter>
      <div className="ma-page">
        <div
          className="ma-disclaimer-banner"
          role="alert"
          aria-label="免责声明"
        >
          ⚠️ 本助手不是医生，不提供诊断或治疗建议。所有信息仅供参考，具体医疗决定请咨询专业医师。如遇紧急情况请拨打{" "}
          <strong>120</strong>。
        </div>

        <div className="ma-container">
          <p className="ma-intro">
            告诉我你的主要不适，我帮你看看可以参加哪些试验。（不是诊断）
          </p>
          <ChatClient />
        </div>
      </div>
    </SiteShell>
  );
}
