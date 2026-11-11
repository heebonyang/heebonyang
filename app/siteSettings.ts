"use client";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore/lite";
import { getFirebase } from "./firebase";
import { ALBUM0 } from "./shop";

// 관리자 페이지 '머리글'에서 고치는 문구. 데이터베이스에 값이 없으면 아래 기본값을 씀
// 음악 탭 머리글 오른쪽에 보이는 바로가기 (관리자 페이지 '링크'에서 관리)
// logo: PNG 이미지 (data URL). 없으면 이름 글자로 표시
export type MusicLink = {
  name: string;
  url: string;
  logo?: string;
};

// 치과 탭 '진료 안내'·'진료 예약·문의'의 한 칸 (관리자 페이지 '치과 정보'에서 관리)
export type InfoItem = { label: string; value: string };

export type SiteSettings = {
  musicTagline: string;
  dentalTagline: string;
  loungeTagline: string;
  musicLinks: MusicLink[];
  // 0집 CD 남은 수량 / 전체 수량 (관리자 페이지 '0집 CD'에서 관리)
  albumStock: number;
  albumTotal: number;
  // 치과 탭 약력 (관리자 페이지 '약력'에서 관리). 한 줄에 하나씩, 앞에 연도를 쓰면 왼쪽에 따로 보임
  dentalBio: string;
  dentalClinic: InfoItem[];
  dentalContact: InfoItem[];
  // true: 라운지 공지는 데이터베이스(관리자 페이지 '공지')에 있는 것만 보여 줌.
  // false(처음): 데이터베이스에 공지가 없으면 app/notices.ts 의 기본 공지를 대신 보여 줌
  noticesInDb: boolean;
};

export const DEFAULT_SETTINGS: SiteSettings = {
  musicTagline: "일상의 이야기를 노래로 만듭니다.",
  dentalTagline: "환자의 이야기를 먼저 듣는 진료를 합니다.",
  loungeTagline: "소식을 전하고, 이야기를 나누는 곳이에요.",
  // 관리자 페이지에서 한 번도 저장하지 않았을 때 보여주는 기본 링크
  musicLinks: [{ name: "Melon", url: "https://www.melon.com/artist/timeline.htm?artistId=869278" }],
  albumStock: ALBUM0.stock,
  albumTotal: ALBUM0.total,
  dentalBio: "",
  dentalClinic: [
    { label: "전문 분야", value: "일반 진료 · 보존 · 보철" },
    { label: "소속", value: "○○치과의원" },
    { label: "진료 시간", value: "평일 09:30 – 18:30" },
  ],
  dentalContact: [
    { label: "전화", value: "02-000-0000" },
    { label: "주소", value: "서울시 ○○구 ○○로 00" },
  ],
  noticesInDb: false,
};

export const SETTINGS_DOC = ["settings", "site"] as const;

let cached: Promise<SiteSettings> | null = null;

export function loadSettings({ fresh = false } = {}): Promise<SiteSettings> {
  if (!cached || fresh) {
    cached = (async () => {
      const fb = await getFirebase();
      if (!fb) return DEFAULT_SETTINGS;
      try {
        const snap = await getDoc(doc(fb.db, ...SETTINGS_DOC));
        return { ...DEFAULT_SETTINGS, ...(snap.data() as Partial<SiteSettings> | undefined) };
      } catch {
        return DEFAULT_SETTINGS;
      }
    })();
  }
  return cached;
}

// 불러오기 전에는 null (예전 문구가 잠깐 보였다 바뀌지 않도록 빈칸으로 둠)
export function useSiteSettings() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  useEffect(() => {
    loadSettings().then(setSettings);
  }, []);
  return settings;
}
