import type { Metadata } from "next";
import { Noto_Sans_KR } from "next/font/google";
import "./globals.css";

const notoKr = Noto_Sans_KR({ subsets: ["latin"], weight: ["400", "500", "700"], display: "swap", preload: false, variable: "--font-noto-kr" });

export const metadata: Metadata = {
  title: "수노 공장",
  description: "Claude와 대화하며 Suno 곡을 만드는 곳",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={notoKr.variable}>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
