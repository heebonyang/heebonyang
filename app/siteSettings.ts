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

export type SiteSettings = {
  musicTagline: string;
  dentalTagline: string;
  musicLinks: MusicLink[];
  // 0집 CD 남은 수량 / 전체 수량 (관리자 페이지 '0집 CD'에서 관리)
  albumStock: number;
  albumTotal: number;
};

export const DEFAULT_SETTINGS: SiteSettings = {
  musicTagline: "일상의 이야기를 노래로 만듭니다.",
  dentalTagline: "환자의 이야기를 먼저 듣는 진료를 합니다.",
  // 관리자 페이지에서 한 번도 저장하지 않았을 때 보여주는 기본 링크
  musicLinks: [{ name: "Melon", url: "https://www.melon.com/artist/timeline.htm?artistId=869278" }],
  albumStock: ALBUM0.stock,
  albumTotal: ALBUM0.total,
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
