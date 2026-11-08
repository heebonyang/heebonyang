import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      // 브랜드 세 가지 색 (썸네일 공방과 같음): 붉은 빛 = 음악, 푸른 빛 = 치과, 초록 빛 = 라운지
      colors: {
        brand: {
          red: "#B45309",
          blue: "#2F4F86",
          green: "#2F6B4F",
        },
        // 0집 페이지(heebonmd.web.app)의 광안리 밤 색
        night: {
          DEFAULT: "#0D1230",
          line: "#262E5A",
          text: "#F3F2F8",
          sub: "#A3A8C6",
          accent: "#A98BFF",
        },
      },
      fontFamily: {
        serif: ["var(--font-batang)", "serif"],
        sans: ["var(--font-inter)", "var(--font-noto-kr)", "Apple SD Gothic Neo", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
