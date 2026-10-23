"use client";
import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore/lite";
import { getFirebase } from "./firebase";
import { RELEASES, TEAMS, type Release, type Team } from "./music";

export type MusicData = {
  releases: Release[];
  teams: Team[];
  // true: 관리자 페이지에서 입력한 데이터 / false: 데이터베이스에 연결하지 못해 app/music.ts의 예시를 씀
  remote: boolean;
};

export const sortReleases = (list: Release[]) => [...list].sort((a, b) => b.date.localeCompare(a.date));
export const sortTeams = (list: Team[]) => [...list].sort((a, b) => b.period.localeCompare(a.period));

export async function loadMusic(): Promise<MusicData> {
  const fallback = { releases: RELEASES, teams: TEAMS, remote: false };
  const fb = await getFirebase();
  if (!fb) return fallback;
  try {
    const [releases, teams] = await Promise.all([
      getDocs(collection(fb.db, "releases")),
      getDocs(collection(fb.db, "teams")),
    ]);
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
