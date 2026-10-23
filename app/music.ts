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

// ── 아래 팀 프로젝트와 발매 음원 목록은 예시입니다 ─────────────────────
// 실제 내용은 /admin 관리자 페이지에서 입력합니다.
// 데이터베이스에 연결할 수 없을 때만 이 예시가 대신 표시됩니다.

// ── 팀 프로젝트 ──────────────────────────────────────────────────

export type Team = {
  id?: string;
  name: string;
  period: string;
  role: string;
  description?: string;
};

export const TEAMS: Team[] = [
  {
    name: "팀 프로젝트 A",
    period: "2021 – 2023",
    role: "보컬 · 작곡",
    description: "대학 동기들과 결성한 4인조 밴드. 공연과 음원 발매를 함께했습니다.",
  },
  {
    name: "팀 프로젝트 B",
    period: "2019 – 2020",
    role: "기타 · 코러스",
    description: "어쿠스틱 듀오 프로젝트.",
  },
];

// ── 발매 음원 목록 ────────────────────────────────────────────────
// 솔로와 팀 음원을 모두 여기에 적습니다. 최신 발매가 위로 오게 해 주세요.
// 맨 위의 솔로 음원이 페이지 상단에 크게 소개됩니다.
// team:  팀 프로젝트 음원이면 위 TEAMS의 팀 이름을 똑같이 적습니다. 솔로 음원은 빼 둡니다.
// cover: public/covers/ 폴더에 이미지를 넣고 "/covers/파일이름.jpg"로 적습니다.
//        비워 두면 제목이 적힌 임시 커버가 표시됩니다.
// links: 해당 음원 페이지 주소. 없는 곳은 지우면 버튼도 사라집니다.

export type Release = {
  id?: string;
  title: string;
  type: "싱글" | "EP" | "정규";
  date: string; // YYYY.MM.DD
  team?: string;
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
  {
    title: "팀 A 정규 1집",
    type: "정규",
    date: "2022.11.04",
    team: "팀 프로젝트 A",
    tracks: ["수록곡 1", "수록곡 2", "수록곡 3", "수록곡 4", "수록곡 5"],
    links: { melon: "#", spotify: "#" },
  },
  {
    title: "팀 A 싱글",
    type: "싱글",
    date: "2021.07.16",
    team: "팀 프로젝트 A",
    tracks: ["팀 A 싱글"],
    links: { melon: "#" },
  },
  {
    title: "팀 B EP",
    type: "EP",
    date: "2020.03.27",
    team: "팀 프로젝트 B",
    tracks: ["수록곡 1", "수록곡 2", "수록곡 3"],
    links: { melon: "#" },
  },
];
