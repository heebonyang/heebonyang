"use client";
import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore/lite";
import { getFirebase } from "./firebase";

// 미발매곡(데모): 관리자 페이지 '데모'에서 올림. audio 는 audioStore.ts 의 "db:<id>" 주소
export type Demo = {
  id?: string;
  title: string;
  note?: string;
  audio: string;
  order?: number; // 작을수록 위
};

export const sortDemos = (list: Demo[]) => [...list].sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER));

export async function loadDemos(): Promise<Demo[]> {
  const fb = await getFirebase();
  if (!fb) return [];
  try {
    const snap = await getDocs(collection(fb.db, "demos"));
    return sortDemos(snap.docs.map((d) => ({ ...(d.data() as Demo), id: d.id })));
  } catch {
    return [];
  }
}

// 불러오기 전에는 null
export function useDemos() {
  const [demos, setDemos] = useState<Demo[] | null>(null);
  useEffect(() => {
    loadDemos().then(setDemos);
  }, []);
  return demos;
}
