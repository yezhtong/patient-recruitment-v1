import Link from "next/link";
import { requireAdminRole } from "@/lib/admin-session";
import BulkImportForm from "./BulkImportForm";

export default async function AdminSensitiveWordsImportPage() {
  try {
    await requireAdminRole();
  } catch {
    return (
      <div className="admin-card">
        <h2>需要管理员权限</h2>
        <p>仅 admin 账号可批量导入敏感词。</p>
        <Link href="/admin/community/sensitive-words" className="btn-admin">返回</Link>
      </div>
    );
  }

  return (
    <>
      <div className="admin-topbar">
        <div>
          <h1>
            批量导入敏感词 <em>/ bulk</em>
          </h1>
          <p className="sub">每行一条，格式 level|type|keyword · 已存在的关键词将更新级别/类型</p>
        </div>
        <div className="admin-actions">
          <Link href="/admin/community/sensitive-words" className="btn-admin btn-admin--ghost">返回列表</Link>
        </div>
      </div>
      <BulkImportForm />
    </>
  );
}
