import Link from "next/link";
import { requireAdminRole } from "@/lib/admin-session";
import { createFaq } from "@/lib/actions/faq";
import FaqForm from "../FaqForm";

export default async function AdminFaqNewPage() {
  try {
    await requireAdminRole();
  } catch {
    return (
      <div className="admin-card">
        <h2>需要管理员权限</h2>
        <p>仅 admin 账号可新建 FAQ。</p>
        <Link href="/admin/faq" className="btn-admin">返回</Link>
      </div>
    );
  }

  return (
    <>
      <div className="admin-topbar">
        <div>
          <h1>
            新建 FAQ <em>/ 新</em>
          </h1>
          <p className="sub">新增一条患者高频问题</p>
        </div>
        <div className="admin-actions">
          <Link href="/admin/faq" className="btn-admin btn-admin--ghost">返回列表</Link>
        </div>
      </div>
      <FaqForm action={createFaq} submitLabel="创建" />
    </>
  );
}
