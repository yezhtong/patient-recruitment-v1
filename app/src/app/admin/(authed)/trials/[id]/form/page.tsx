import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdminRole } from "@/lib/admin-session";
import Link from "next/link";
import { FormEditorClient } from "./FormEditorClient";

export default async function FormEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireAdminRole();

  // 查询试验
  const trial = await prisma.clinicalTrial.findUnique({
    where: { id },
    select: { id: true, title: true, slug: true },
  });

  if (!trial) {
    notFound();
  }

  // 查询或创建表单
  let form = await prisma.trialPrescreenForm.findUnique({
    where: { trialId: trial.id },
    include: {
      items: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!form) {
    // 自动创建空表单
    form = await prisma.trialPrescreenForm.create({
      data: { trialId: trial.id },
      include: { items: true },
    });
  }

  // 转换数据给前端（JSON 字符串解析）
  const formData: any = {
    id: form.id,
    trialId: form.trialId,
    version: form.version,
    isPublished: form.isPublished,
    title: form.title ?? undefined,
    description: form.description ?? undefined,
    successMessage: form.successMessage ?? undefined,
    generatedBy: form.generatedBy ?? undefined,
    generatedAt: form.generatedAt?.toISOString() ?? undefined,
    items: form.items.map((item) => ({
      id: item.id,
      formId: item.formId,
      fieldKey: item.fieldKey,
      label: item.label,
      helpText: item.helpText,
      fieldType: item.fieldType as
        | "single"
        | "multi"
        | "text"
        | "textarea"
        | "number"
        | "date"
        | "agree",
      options: item.options ? JSON.parse(item.options) : undefined,
      placeholder: item.placeholder,
      defaultValue: item.defaultValue ? JSON.parse(item.defaultValue) : undefined,
      isRequired: item.isRequired,
      minValue: item.minValue,
      maxValue: item.maxValue,
      regex: item.regex,
      errorMessage: item.errorMessage,
      showWhen: item.showWhen ? JSON.parse(item.showWhen) : undefined,
      sortOrder: item.sortOrder,
    })),
  };

  return (
    <div className="form-editor-page">
      {/* Topbar */}
      <div className="admin-topbar">
        <div>
          <h1>
            编辑预筛表单 <em>/ {trial.title}</em>
          </h1>
          <p className="sub">
            版本 {form.version} · {form.isPublished ? "已发布" : "草稿"}
          </p>
        </div>
        <div className="admin-actions">
          <Link href={`/admin/trials/${trial.id}/edit`} className="btn-admin btn-admin--ghost">
            返回试验详情
          </Link>
        </div>
      </div>

      {/* Editor Client */}
      <FormEditorClient trial={trial} form={formData} />
    </div>
  );
}
