// ── 음악 탭 내용 ─────────────────────────────────────────────────
export const MUSIC_PROFILE = {
  name: "양희본",
  tagline: "일상의 이야기를 노래로 만듭니다.",
  about:
    "어쿠스틱 기타 한 대로 시작한 노래들입니다. 직접 쓰고, 직접 부르고, 가끔 작은 무대에 섭니다.",
  contact: [
    { label: "Instagram", href: "#" },
    { label: "YouTube", href: "#" },
    { label: "Email", href: "mailto:music@example.com" },
  ],
};

// ── 발매 음원 목록 ────────────────────────────────────────────────
// 최신 발매가 맨 위에 오도록 적어 주세요. 맨 위 음원이 페이지 상단에 크게 소개됩니다.
// cover: public/covers/ 폴더에 이미지를 넣고 "/covers/파일이름.jpg"로 적습니다.
//        비워 두면 제목이 적힌 임시 커버가 표시됩니다.
// links: 해당 음원 페이지 주소. 없는 곳은 지우면 버튼도 사라집니다.

export type Release = {
  title: string;
  type: "싱글" | "EP" | "정규";
  date: string; // YYYY.MM.DD
  cover?: string;
  description?: string;
  tracks: string[];
  links: { melon?: string; spotify?: string; apple?: string; youtube?: string };
};

export const RELEASES: Release[] = [
  {
    title: "다섯 번째 싱글",
    type: "싱글",
    date: "2026.05.20",
    description: "퇴근길 버스 창가에서 쓴 노래입니다. 하루를 무사히 보낸 사람들에게 건네는 짧은 인사.",
    tracks: ["다섯 번째 싱글", "다섯 번째 싱글 (Inst.)"],
    links: { melon: "#", spotify: "#", apple: "#", youtube: "#" },
  },
  {
    title: "첫 번째 EP",
    type: "EP",
    date: "2025.09.12",
    tracks: ["Intro", "수록곡 2", "수록곡 3", "수록곡 4"],
    links: { melon: "#", spotify: "#" },
  },
  {
    title: "네 번째 싱글",
    type: "싱글",
    date: "2025.03.03",
    tracks: ["네 번째 싱글"],
    links: { melon: "#", youtube: "#" },
  },
  {
    title: "세 번째 싱글",
    type: "싱글",
    date: "2024.08.30",
    tracks: ["세 번째 싱글"],
    links: { melon: "#" },
  },
  {
    title: "두 번째 싱글",
    type: "싱글",
    date: "2024.01.15",
    tracks: ["두 번째 싱글"],
    links: { melon: "#" },
  },
  {
    title: "데뷔 싱글",
    type: "싱글",
    date: "2023.06.01",
    tracks: ["데뷔 싱글"],
    links: { melon: "#" },
  },
];
