import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";

type NavKey = "home" | "trials" | "community" | "me" | "about" | "contact";

interface Props {
  current?: NavKey;
  children: React.ReactNode;
  hideFooter?: boolean;
}

export async function SiteShell({ current, children, hideFooter }: Props) {
  return (
    <>
      <SiteHeader current={current} />
      <main id="main">{children}</main>
      {hideFooter ? null : <SiteFooter />}
    </>
  );
}
