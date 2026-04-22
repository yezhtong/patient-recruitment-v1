import Link from "next/link";
import { requireAdminRole } from "@/lib/admin-session";
import { createSensitiveWord } from "@/lib/actions/sensitive-words";
import SensitiveWordForm from "../SensitiveWordForm";

export default async function AdminSensitiveWordNewPage() {
  try {
    await requireAdminRole();
  } catch {
    return (
      <div className="admin-card">
        <h2>需要管理员权限</h2>
        <p>仅 admin 账号可新建敏感词。</p>
        <Link href="/admin/community/sensitive-words" className="btn-admin">返回</Link>
      </div>
    );
  }

  return (
    <>
      <div className="admin-topbar">
        <div>
          <h1>
            新建敏感词 <em>/ 新</em>
          </h1>
          <p className="sub">加入词库后扫描即时生效（最迟 60 秒）</p>
        </div>
        <div className="admin-actions">
          <Link href="/admin/community/sensitive-words" className="btn-admin btn-admin--ghost">返回列表</Link>
        </div>
      </div>
      <SensitiveWordForm action={createSensitiveWord} submitLabel="创建" />
    </>
  );
}
