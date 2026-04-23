import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin-session";
import { prisma } from "@/lib/prisma";
import { updateTrial } from "@/lib/actions/trials";
import { TrialForm } from "../../TrialForm";
import { DeleteTrialButton } from "./DeleteTrialButton";

export default async function AdminTrialEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getAdminSession();
  if (session.role !== "admin") {
    redirect("/admin/trials");
  }

  const { id } = await params;
  const trial = await prisma.clinicalTrial.findUnique({ where: { id } });
  if (!trial) return notFound();

  const boundUpdate = updateTrial.bind(null, id);

  return (
    <>
      <div className="admin-topbar">
        <div>
          <h1>
            编辑 <em>/ {trial.slug}</em>
          </h1>
          <p className="sub">最近更新：{trial.updatedAt.toISOString().slice(0, 16).replace("T", " ")}</p>
        </div>
        <div className="admin-actions">
          <Link
            href={`/admin/trials/${trial.id}/form`}
            className="btn-admin"
          >
            📋 编辑预筛表单
          </Link>
          <Link
            href={`/trials/${trial.slug}`}
            target="_blank"
            className="btn-admin"
          >
            ↗ 预览公开页
          </Link>
        </div>
      </div>

      <TrialForm
        action={boundUpdate}
        defaults={trial}
        submitLabel="保存修改"
        extraActions={<DeleteTrialButton id={trial.id} title={trial.title} />}
      />
    </>
  );
}
