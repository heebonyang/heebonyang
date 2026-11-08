import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      // 동틀 녘 테마: 새벽하늘처럼 옅은 푸른빛·분홍빛이 도는 밝은 바탕
      // 메인 색은 0집 CD 표지의 파랑(#1A4A9C) 결. 글씨·버튼을 이 파랑에서 뽑은 단계로 맞춤
      //   stone-50 = 바탕, stone-200 = 선, stone-500 = 흐린 글씨, stone-900 = 제목·버튼 (표지 파랑을 깊게)
      colors: {
        stone: {
          50: "#F3F5F9",
          100: "#EAEEF5",
          200: "#DCE2EC",
          300: "#C3CCDA",
          400: "#7F8AA0", // 날짜·안내처럼 가장 흐린 글씨
          500: "#5F6B84", // 보조 설명
          600: "#4B5772",
          700: "#34405C", // 본문
          800: "#1F3566",
          900: "#163A7A", // 제목·중요한 글씨·버튼 (0집 표지 파랑을 한 단계 깊게)
        },
        card: "#FFFCFA", // 카드·입력 칸 바탕 (새하얀색 대신 아주 옅은 살구빛)
        // 브랜드 세 가지 색 (썸네일 공방과 같음): 붉은 빛 = 음악, 푸른 빛 = 치과, 초록 빛 = 라운지
        brand: {
          red: "#B45309",
          blue: "#2F4F86",
          green: "#2F6B4F",
        },
        // 메인 강조색: 0집 CD 표지의 파랑
        dawn: {
          accent: "#1A4A9C",
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
