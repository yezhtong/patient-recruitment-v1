import { redirect } from "next/navigation";
import { SiteShell } from "@/components/SiteShell";
import { getUserSession, isLoggedIn } from "@/lib/user-session";
import { AuthLoginForm } from "./AuthLoginForm";
import "./styles.css";

export const metadata = {
  title: "登录 / 注册 · 九泰临研",
};

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const session = await getUserSession();
  const { next } = await searchParams;
  if (isLoggedIn(session)) {
    const safeNext =
      next && next.startsWith("/") && !next.startsWith("//") ? next : "/me";
    redirect(safeNext);
  }

  return (
    <SiteShell hideFooter>
      <AuthLoginForm next={next} />
    </SiteShell>
  );
}
