import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      // 라운지 색: 썸네일 공방의 짙은 파랑(공지)과 초록(방명록)
      colors: {
        notice: "#2F4F86",
        guest: "#2F6B4F",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "var(--font-noto-kr)", "Apple SD Gothic Neo", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
