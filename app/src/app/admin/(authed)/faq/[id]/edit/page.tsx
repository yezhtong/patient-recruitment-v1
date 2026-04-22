import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/admin-session";
import { updateFaq } from "@/lib/actions/faq";
import FaqForm from "../../FaqForm";
import DeleteFaqButton from "./DeleteFaqButton";

export default async function AdminFaqEditPage({
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
        <p>仅 admin 账号可编辑 FAQ。</p>
        <Link href="/admin/faq" className="btn-admin">返回</Link>
      </div>
    );
  }

  const { id } = await params;
  const faq = await prisma.faqArticle.findUnique({ where: { id } });
  if (!faq) notFound();

  const bound = updateFaq.bind(null, id);

  return (
    <>
      <div className="admin-topbar">
        <div>
          <h1>
            编辑 FAQ <em>/ {faq.slug}</em>
          </h1>
          <p className="sub">
            创建 {faq.createdAt.toISOString().slice(0, 10)} · 更新 {faq.updatedAt.toISOString().slice(0, 10)}
          </p>
        </div>
        <div className="admin-actions">
          <Link href="/admin/faq" className="btn-admin btn-admin--ghost">返回列表</Link>
          <DeleteFaqButton id={faq.id} question={faq.question} />
        </div>
      </div>
      <FaqForm
        action={bound}
        submitLabel="保存"
        initial={{
          slug: faq.slug,
          question: faq.question,
          answer: faq.answer,
          category: faq.category,
          tags: faq.tags,
          order: faq.order,
          isPublished: faq.isPublished,
        }}
      />
    </>
  );
}
