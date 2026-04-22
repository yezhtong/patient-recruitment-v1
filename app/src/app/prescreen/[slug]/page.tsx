import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { SiteShell } from "@/components/SiteShell";
import { prisma } from "@/lib/prisma";
import { getUserSession, isLoggedIn } from "@/lib/user-session";
import { PrescreenForm } from "./PrescreenForm";
import "./styles.css";

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
