import { redirect } from "next/navigation";
import { createTrial } from "@/lib/actions/trials";
import { getAdminSession } from "@/lib/admin-session";
import { TrialForm } from "../TrialForm";

export default async function AdminTrialNewPage() {
  const session = await getAdminSession();
  if (session.role !== "admin") {
    redirect("/admin/trials");
  }

  return (
    <>
      <div className="admin-topbar">
        <div>
          <h1>
            新建试验 <em>/ new</em>
          </h1>
          <p className="sub">填写患者友好文案、研究中心与合规信息</p>
        </div>
      </div>
      <TrialForm action={createTrial} submitLabel="创建试验" />
    </>
  );
}
