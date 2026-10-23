"use client";
import { collection, getDocs, type Timestamp } from "firebase/firestore/lite";
import { getFirebase } from "./firebase";

export type Notice = {
  id?: string;
  title: string;
  body: string;
  pinned: boolean;
  createdAt: Timestamp | null;
};

// 데이터베이스에 연결할 수 없을 때 보여주는 예시 공지
const SAMPLE_NOTICES: Notice[] = [
  {
    title: "홈페이지를 열었습니다",
    body: "새 음원 소식과 공연 일정, 진료 안내를 이곳에서 전할게요. 방명록에도 편하게 글 남겨 주세요.",
    pinned: true,
    createdAt: null,
  },
];

// 고정 공지를 맨 위에, 나머지는 최신순
export const sortNotices = (list: Notice[]) =>
  [...list].sort(
    (a, b) => Number(b.pinned) - Number(a.pinned) || (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0),
  );

export async function loadNotices(): Promise<{ notices: Notice[]; remote: boolean }> {
  const fallback = { notices: SAMPLE_NOTICES, remote: false };
  const fb = await getFirebase();
  if (!fb) return fallback;
  try {
    const snap = await getDocs(collection(fb.db, "notices"));
    return { notices: sortNotices(snap.docs.map((d) => ({ ...(d.data() as Notice), id: d.id }))), remote: true };
  } catch {
    return fallback;
  }
}
