import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      // 밤바다 테마 (0집 페이지 heebonmd.web.app 과 같은 남색 바탕)
      // 사이트 곳곳의 stone(회색) 단계를 밝고 어두움을 뒤집은 남색 단계로 바꿔서, 화면 전체가 한꺼번에 어두운 바탕이 됨
      //   stone-50 = 바탕, stone-200 = 선, stone-500 = 흐린 글씨, stone-900 = 가장 밝은 글씨·버튼
      colors: {
        stone: {
          50: "#0D1230",
          100: "#1A2148",
          200: "#262E5A",
          300: "#3A4270",
          400: "#8A90B3",
          500: "#A3A8C6",
          600: "#BFC3DD",
          700: "#D3D6E8",
          800: "#E4E5F0",
          900: "#F3F2F8",
        },
        card: "#131A3D", // 카드·입력 칸 바탕 (예전 흰색 자리)
        // 어두운 바탕에서도 잘 보이게 밝힌 강조색
        amber: { 50: "#2A2236", 300: "#6B5434", 600: "#E39B63", 700: "#E39B63", 800: "#F0C08A", 900: "#F0C08A" },
        red: { 600: "#F87171", 700: "#F87171" },
        rose: { 50: "#3A1F35", 600: "#F472B6" },
        // 브랜드 세 가지 색 (썸네일 공방과 같은 붉은·푸른·초록 빛을 밤바탕에 맞게 밝힘): 음악, 치과, 라운지
        brand: {
          red: "#E39B63",
          blue: "#8AAEF0",
          green: "#7CC9A2",
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
