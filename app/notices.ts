"use client";
import { collection, getDocs, Timestamp } from "firebase/firestore/lite";
import { getFirebase } from "./firebase";

export type Notice = {
  id?: string;
  title: string;
  body: string;
  pinned: boolean;
  createdAt: Timestamp | null;
};

// 데이터베이스에 공지가 없거나 연결할 수 없을 때 보여주는 공지
// (관리자 페이지의 '기존 내용 가져오기'로 데이터베이스에 옮길 수 있음)
export const STATIC_NOTICES: Notice[] = [
  {
    title: "🎙 양희본 세로 라이브 100일, 시작합니다",
    body: `2026년 12월 14일 월요일부터 100일 동안, 매일 밤 10시에 세로 라이브를 켭니다.
자작곡을 부르고, 곡이 만들어진 이야기를 나누고, 작업 중인 새 곡도 조금씩 먼저 들려드릴게요. 커버 없이 제 노래로만 채우는 시간입니다.

📅 기간: 2026년 12월 14일(월) ~ 2027년 3월 23일(화)
⏰ 시간: 매일 밤 10시, 약 1시간
📍 채널: https://www.youtube.com/@양희본

혼자 부르는 날도 있겠지만, 하루도 빠지지 않고 켜두겠습니다. 지나가다 들러서 한 곡만 듣고 가셔도 좋아요.
Day 1에서 만나요.`,
    pinned: true,
    createdAt: Timestamp.fromDate(new Date(2026, 9, 27)),
  },
  {
    title: "홈페이지를 열었습니다",
    body: "새 음원 소식과 공연 일정, 진료 안내를 이곳에서 전할게요. 방명록에도 편하게 글 남겨 주세요.",
    pinned: false,
    createdAt: null,
  },
];

// 고정 공지를 맨 위에, 나머지는 최신순
export const sortNotices = (list: Notice[]) =>
  [...list].sort(
    (a, b) => Number(b.pinned) - Number(a.pinned) || (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0),
  );

// showStaticWhenEmpty: 데이터베이스에 공지가 없으면 위 공지를 대신 보여줌
export async function loadNotices({ showStaticWhenEmpty = true } = {}): Promise<{ notices: Notice[]; remote: boolean }> {
  const fallback = { notices: STATIC_NOTICES, remote: false };
  const fb = await getFirebase();
  if (!fb) return fallback;
  try {
    const snap = await getDocs(collection(fb.db, "notices"));
    if (showStaticWhenEmpty && snap.empty) return fallback;
    return { notices: sortNotices(snap.docs.map((d) => ({ ...(d.data() as Notice), id: d.id }))), remote: true };
  } catch {
    return fallback;
  }
}
