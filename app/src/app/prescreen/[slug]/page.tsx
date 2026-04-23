import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { SiteShell } from "@/components/SiteShell";
import { prisma } from "@/lib/prisma";
import { getUserSession, isLoggedIn } from "@/lib/user-session";
import { PrescreenForm } from "./PrescreenForm";
import { DynamicPrescreenForm } from "./DynamicPrescreenForm";
import "./styles.css";

function safeJsonParse<T>(s: string | null): T | null {
  if (!s) return null;
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const trial = await prisma.clinicalTrial.findUnique({
    where: { slug },
    select: { title: true },
  });
  return {
    title: trial ? `预筛：${trial.title}` : "预筛",
    robots: { index: false, follow: true },
  };
}

export default async function PrescreenPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const session = await getUserSession();
  if (!isLoggedIn(session)) {
    redirect(`/auth?next=${encodeURIComponent(`/prescreen/${slug}`)}`);
  }

  const trial = await prisma.clinicalTrial.findUnique({ where: { slug } });
  if (!trial) return notFound();

  const prefill = {
    name: session.displayName,
    phone: session.phone,
  };

  // M8.2 T6 · 动态预筛：若该试验有已发布的 TrialPrescreenForm，走 DynamicPrescreenForm；否则降级到 PrescreenForm（通用版）
  const form = await prisma.trialPrescreenForm.findUnique({
    where: { trialId: trial.id },
    include: {
      items: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (form && form.isPublished && form.items.length > 0) {
    const itemDtos = form.items.map((it) => ({
      id: it.id,
      fieldKey: it.fieldKey,
      label: it.label,
      helpText: it.helpText,
      fieldType: it.fieldType as
        | "single"
        | "multi"
        | "text"
        | "textarea"
        | "number"
        | "date"
        | "agree",
      options: safeJsonParse<Array<{ value: string; label: string }>>(it.options),
      placeholder: it.placeholder,
      defaultValue: safeJsonParse<unknown>(it.defaultValue),
      isRequired: it.isRequired,
      minValue: it.minValue,
      maxValue: it.maxValue,
      regex: it.regex,
      errorMessage: it.errorMessage,
      showWhen: safeJsonParse<{
        fieldKey: string;
        op: "eq" | "neq" | "in" | "notIn";
        value: unknown;
      }>(it.showWhen),
      sortOrder: it.sortOrder,
    }));

    return (
      <SiteShell current="trials">
        <DynamicPrescreenForm
          slug={trial.slug}
          title={trial.title}
          disease={trial.disease}
          phase={trial.phase}
          city={trial.city}
          prefill={prefill}
          formTitle={form.title}
          formDescription={form.description}
          items={itemDtos}
        />
      </SiteShell>
    );
  }

  // 降级：通用预筛（M1 版，硬编码字段）
  return (
    <SiteShell current="trials">
      <PrescreenForm
        slug={trial.slug}
        title={trial.title}
        disease={trial.disease}
        phase={trial.phase}
        city={trial.city}
        prefill={prefill}
      />
    </SiteShell>
  );
}
