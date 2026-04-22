import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/admin-session";
import { updateSensitiveWord } from "@/lib/actions/sensitive-words";
import SensitiveWordForm from "../../SensitiveWordForm";
import DeleteSensitiveWordButton from "./DeleteSensitiveWordButton";

export default async function AdminSensitiveWordEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  try {
    await requireAdminRole();
  } catch {
    return (
      <div className="admin-card">
        <h2>需要管理员权限</h2>
        <p>仅 admin 账号可编辑敏感词。</p>
        <Link href="/admin/community/sensitive-words" className="btn-admin">返回</Link>
      </div>
    );
  }

  const { id } = await params;
  const word = await prisma.sensitiveWord.findUnique({ where: { id } });
  if (!word) notFound();

  const bound = updateSensitiveWord.bind(null, id);

  return (
    <>
      <div className="admin-topbar">
        <div>
          <h1>
            编辑敏感词 <em>/ {word.keyword}</em>
          </h1>
          <p className="sub">
            创建 {word.createdAt.toISOString().slice(0, 10)} · 更新 {word.updatedAt.toISOString().slice(0, 10)}
          </p>
        </div>
        <div className="admin-actions">
          <Link href="/admin/community/sensitive-words" className="btn-admin btn-admin--ghost">返回列表</Link>
          <DeleteSensitiveWordButton id={word.id} keyword={word.keyword} />
        </div>
      </div>
      <SensitiveWordForm
        action={bound}
        submitLabel="保存"
        initial={{
          keyword: word.keyword,
          riskType: word.riskType,
          riskLevel: word.riskLevel,
          isEnabled: word.isEnabled,
          note: word.note,
        }}
      />
    </>
  );
}
