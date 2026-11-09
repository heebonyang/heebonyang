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
        // 0집 CD 판매 영역 전용 색 (0집 판매 페이지 heebonmd.web.app과 같은 색)
        album: {
          navy: "#15489E",
          cream: "#FEF7ED",
          line: "#E2D6C2",
          edge: "#C9BBA3",
          ink: "#1A2033",
          sub: "#3D4459",
          muted: "#646A7E",
        },
      },
      fontFamily: {
        // 0집 배너: 0집 판매 페이지처럼 숫자·영문까지 Noto Sans KR 로
        kr: ["var(--font-noto-kr)", "Apple SD Gothic Neo", "sans-serif"],
        sans: ["var(--font-inter)", "var(--font-noto-kr)", "Apple SD Gothic Neo", "sans-serif"],
        serif: ["var(--font-gowun)", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;
