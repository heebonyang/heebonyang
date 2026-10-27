"use client";
import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore/lite";
import { getFirebase } from "./firebase";
import { RELEASES, TEAMS, type Release, type Team } from "./music";

export type MusicData = {
  releases: Release[];
  teams: Team[];
  // true: 데이터베이스에서 읽은 데이터 / false: app/music.ts에 적힌 내용
  remote: boolean;
};

export const sortReleases = (list: Release[]) => [...list].sort((a, b) => b.date.localeCompare(a.date));
export const sortTeams = (list: Team[]) => [...list].sort((a, b) => b.period.localeCompare(a.period));

// showStaticWhenEmpty: 데이터베이스가 비어 있으면 app/music.ts의 내용을 대신 보여줌
// (관리자 페이지에서 기존 내용을 가져오기 전까지 사이트가 비어 보이지 않게 함)
export async function loadMusic({ showStaticWhenEmpty = true } = {}): Promise<MusicData> {
  const fallback = { releases: RELEASES, teams: TEAMS, remote: false };
  const fb = await getFirebase();
  if (!fb) return fallback;
  try {
    const [releases, teams] = await Promise.all([
      getDocs(collection(fb.db, "releases")),
      getDocs(collection(fb.db, "teams")),
    ]);
    if (showStaticWhenEmpty && releases.empty) return fallback;
    return {
      releases: sortReleases(releases.docs.map((d) => ({ ...(d.data() as Release), id: d.id }))),
      teams: sortTeams(teams.docs.map((d) => ({ ...(d.data() as Team), id: d.id }))),
      remote: true,
    };
  } catch {
    return fallback;
  }
}

export function useMusicData() {
  const [data, setData] = useState<MusicData | null>(null);
  useEffect(() => {
    loadMusic().then(setData);
  }, []);
  return data;
}
