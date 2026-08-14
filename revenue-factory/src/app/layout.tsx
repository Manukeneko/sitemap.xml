import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI収益工場 | 司令塔ダッシュボード",
  description: "AI Revenue Factory - Phase 1 command center",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
