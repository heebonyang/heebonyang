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
      },
      fontFamily: {
        sans: ["var(--font-inter)", "var(--font-noto-kr)", "Apple SD Gothic Neo", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
