import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      // 동틀 녘 테마: 새벽하늘처럼 옅은 푸른빛·분홍빛이 도는 밝은 바탕, 글씨는 새벽 남보라
      // 사이트 곳곳의 stone(회색) 단계를 이 색들로 바꿔서 한꺼번에 적용
      //   stone-50 = 바탕, stone-200 = 선, stone-500 = 흐린 글씨, stone-900 = 가장 진한 글씨·버튼
      colors: {
        stone: {
          50: "#F5F2F6",
          100: "#EDE8F0",
          200: "#E2DCE7",
          300: "#CFC7D6",
          400: "#9C94A8",
          500: "#766F88",
          600: "#615A74",
          700: "#4A4460",
          800: "#332E48",
          900: "#232038",
        },
        card: "#FFFCFA", // 카드·입력 칸 바탕 (새하얀색 대신 아주 옅은 살구빛)
        // 브랜드 세 가지 색 (썸네일 공방과 같음): 붉은 빛 = 음악, 푸른 빛 = 치과, 초록 빛 = 라운지
        brand: {
          red: "#B45309",
          blue: "#2F4F86",
          green: "#2F6B4F",
        },
        // 0집 구매 페이지 강조색 (0집 페이지의 라벤더를 밝은 바탕에 맞게 진하게)
        dawn: {
          accent: "#6E56CF",
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
