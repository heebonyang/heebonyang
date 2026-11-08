import type { Metadata } from "next";
import { Gowun_Batang, Inter, Noto_Sans_KR } from "next/font/google";
import "./globals.css";

// 명함과 같은 글꼴: 영문·숫자는 Inter, 한글은 Noto Sans KR
const inter = Inter({ subsets: ["latin"], display: "swap", variable: "--font-inter" });
// 0집 배너 제목용 (0집 페이지 heebonmd.web.app 과 같은 글꼴)
const batang = Gowun_Batang({ subsets: ["latin"], weight: ["700"], display: "swap", preload: false, variable: "--font-batang" });
const notoKr = Noto_Sans_KR({ subsets: ["latin"], weight: ["400", "500", "600", "700"], display: "swap", preload: false, variable: "--font-noto-kr" });

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
    <html lang="ko" className={`${inter.variable} ${notoKr.variable} ${batang.variable}`}>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
