import type { Metadata } from "next";
import "./design-system.css";
import "./globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "九泰临研 · 让你找到适合自己的临床试验",
    template: "%s · 九泰临研",
  },
  description:
    "九泰临研患者招募平台，帮你找到适合自己的临床试验项目。专业团队主动联系，免费用药与检查，信息严格保密，随时可以退出。",
  applicationName: "九泰临研",
  keywords: ["临床试验", "患者招募", "CRO", "九泰药械", "医疗器械临床试验"],
  authors: [{ name: "九泰药械" }],
  openGraph: {
    type: "website",
    locale: "zh_CN",
    siteName: "九泰临研",
    title: "九泰临研 · 让你找到适合自己的临床试验",
    description:
      "帮你找到适合自己的临床试验项目。专业团队主动联系，免费用药与检查，信息严格保密，随时可以退出。",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "九泰临研 · 让你找到适合自己的临床试验",
    description:
      "帮你找到适合自己的临床试验项目。免费参与、随时退出、信息严格保密。",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
