"use server";

import { getUserSession, isLoggedIn } from "@/lib/user-session";
import { prisma } from "@/lib/prisma";

export async function dismissRecommendAction(): Promise<void> {
  const session = await getUserSession();
  if (!isLoggedIn(session)) return;

  await prisma.user.update({
    where: { id: session.userId },
    data: { recommendDismissedAt: new Date() },
  });
}
