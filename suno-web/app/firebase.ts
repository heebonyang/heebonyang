"use client";
import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore/lite";

// 로그인(auth)은 관리자 페이지에서만 따로 불러와서, 일반 방문자 페이지를 가볍게 유지
export type FirebaseServices = { app: FirebaseApp; db: Firestore };

let cached: Promise<FirebaseServices | null> | null = null;

// Firebase Hosting이 자동으로 제공하는 /__/firebase/init.json에서 설정을 읽어옴.
// 그래서 API 키 같은 설정값을 코드에 따로 적지 않아도 됨.
// 로컬 개발 서버처럼 이 주소가 없는 곳에서는 null을 돌려줌.
export function getFirebase(): Promise<FirebaseServices | null> {
  if (!cached) {
    cached = (async () => {
      try {
        const res = await fetch("/__/firebase/init.json");
        if (!res.ok) return null;
        const config = await res.json();
        if (!config?.apiKey) return null;
        const app = getApps()[0] ?? initializeApp(config);
        return { app, db: getFirestore(app) };
      } catch {
        return null;
      }
    })();
  }
  return cached;
}
