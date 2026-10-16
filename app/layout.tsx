import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "亚马逊运营中枢",
  description: "亚马逊销售、广告、订单与待办一站式运营工作台。",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
