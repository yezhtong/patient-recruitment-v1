import { redirect, notFound } from "next/navigation";
import { SiteShell } from "@/components/SiteShell";
import { prisma } from "@/lib/prisma";
import { getUserSession, isLoggedIn } from "@/lib/user-session";
import { JoinGroupClient } from "./JoinGroupClient";
import "../../community.css";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ groupSlug: string }>;
}) {
  const { groupSlug } = await params;
  const group = await prisma.communityGroup.findUnique({
    where: { slug: groupSlug, isEnabled: true },
    select: { name: true },
  });
  return {
    title: group ? `加入${group.name} · 九泰临研社区` : "加入分区 · 九泰临研社区",
    robots: { index: false, follow: false },
  };
}

export default async function JoinGroupPage({
  params,
}: {
  params: Promise<{ groupSlug: string }>;
}) {
  const { groupSlug } = await params;

  const session = await getUserSession();
  if (!isLoggedIn(session)) {
    redirect(`/auth?next=/community/join/${groupSlug}`);
  }

  const group = await prisma.communityGroup.findUnique({
    where: { slug: groupSlug, isEnabled: true },
    select: { id: true, name: true, slug: true },
  });

  if (!group) notFound();

  const memberships = await prisma.userGroupMembership.findMany({
    where: { userId: session.userId, leftAt: null },
    select: { id: true },
  });
  const userRemainingSlots = Math.max(0, 3 - memberships.length);

  return (
    <SiteShell current="community">
      <main className="cm-shell">
        <div className="container" style={{ maxWidth: 560 }}>
          <JoinGroupClient
            groupSlug={group.slug}
            groupName={group.name}
            userRemainingSlots={userRemainingSlots}
          />
        </div>
      </main>
    </SiteShell>
  );
}
