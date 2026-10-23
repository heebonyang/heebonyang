import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "양희본 — 싱어송라이터 · 치과의사",
  description: "음악과 치과 진료를 각각의 탭에서 소개합니다.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className={inter.className}>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
