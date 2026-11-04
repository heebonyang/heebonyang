"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import MusicPanel from "./MusicPanel";
import Lounge from "./Lounge";
import RolePill from "./RolePill";
import SocialLinks from "./SocialLinks";
import { useSiteSettings } from "./siteSettings";

// ── 치과 탭 내용 (음악 탭 내용은 app/music.ts) ──────────────────────
// 음악과 치과는 서로 완전히 분리된 탭으로, 내용이 섞이지 않습니다.
const NAME_EN = "Heebon Yang";

const DENTAL = {
  role: "치과의사",
  title: "양희본",
  items: [
    { label: "전문 분야", value: "일반 진료 · 보존 · 보철" },
    { label: "소속", value: "○○치과의원" },
    { label: "진료 시간", value: "평일 09:30 – 18:30" },
  ],
  contact: [
    { label: "전화", value: "02-000-0000" },
    { label: "주소", value: "서울시 ○○구 ○○로 00" },
  ],
};
// ────────────────────────────────────────────────────────────────

type Tab = "music" | "dental" | "lounge";

const TAB_LABELS: Record<Tab, string> = { music: "음악", dental: "치과", lounge: "라운지" };

const THEME = {
  music:  { eyebrow: "text-brand-red",   active: "bg-brand-red text-white" },
  dental: { eyebrow: "text-brand-blue",  active: "bg-brand-blue text-white" },
  lounge: { eyebrow: "text-brand-green", active: "bg-brand-green text-white" },
};

// tagline(머리글)은 관리자 페이지 '머리글'에서 수정
function Hero({ tab, role, title, tagline }: { tab: Tab; role: string; title: string; tagline?: string }) {
  return (
    <div className="pt-12 pb-16">
      {/* 명함처럼 이름 옆에 탭 색 알약으로 직업 표시 (음악 탭과 같은 크기) */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-stone-900">{title}</h1>
          <RolePill color={tab === "music" ? "amber" : "sky"}>{role}</RolePill>
        </div>
        <p className="text-stone-500">{tagline}</p>
      </div>
    </div>
  );
}

function Section({ tab, eyebrow, title, children }: { tab: Tab; eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <section className="py-14 border-t border-stone-200">
      <p className={`text-xs font-semibold tracking-[0.2em] uppercase ${THEME[tab].eyebrow}`}>{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-bold text-stone-900">{title}</h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

// 약력 한 줄: "2015 ○○대학교 치의학대학원 졸업"처럼 앞에 연도(기간)가 있으면 왼쪽 칸에 따로 보여 줌
function splitBioLine(line: string) {
  const m = line.match(/^(\d{4}(?:[.\d]*)?(?:\s*[~–—-]\s*(?:\d{4}(?:[.\d]*)?|현재)?)?)\s+(.+)$/);
  return m ? { when: m[1], what: m[2] } : { when: "", what: line };
}

function DentalBio({ bio }: { bio: string }) {
  const lines = bio.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return null;
  return (
    <Section tab="dental" eyebrow="Profile" title="약력">
      <ul className="rounded-2xl border border-stone-200 bg-white divide-y divide-stone-200">
        {lines.map((line, i) => {
          const { when, what } = splitBioLine(line);
          return (
            <li key={i} className="grid gap-1 sm:grid-cols-[160px_1fr] sm:gap-6 px-5 py-4">
              <span className={`text-sm font-semibold text-brand-blue tabular-nums ${when ? "" : "hidden sm:block"}`}>{when}</span>
              <span className="text-stone-900">{what}</span>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

function DentalPanel() {
  const settings = useSiteSettings();
  return (
    <>
      <Hero tab="dental" {...DENTAL} tagline={settings?.dentalTagline} />
      {/* 약력은 이름 바로 아래, 가장 먼저 보이는 자리 */}
      {settings && <DentalBio bio={settings.dentalBio} />}
      <Section tab="dental" eyebrow="Clinic" title="진료 안내">
        <dl className="grid gap-4 sm:grid-cols-3">
          {DENTAL.items.map((item) => (
            <div key={item.label} className="rounded-xl border border-stone-200 bg-white p-5">
              <dt className="text-sm text-stone-500">{item.label}</dt>
              <dd className="mt-1 font-medium text-stone-900">{item.value}</dd>
            </div>
          ))}
        </dl>
      </Section>
      <Section tab="dental" eyebrow="Contact" title="진료 예약·문의">
        <dl className="space-y-2 text-sm">
          {DENTAL.contact.map((item) => (
            <div key={item.label} className="flex gap-3">
              <dt className="text-stone-500">{item.label}</dt>
              <dd className="text-stone-900">{item.value}</dd>
            </div>
          ))}
        </dl>
      </Section>
    </>
  );
}

export default function ProfileTabs() {
  const [tab, setTab] = useState<Tab>("music");

  // #music / #dental / #lounge 주소로 바로 해당 탭을 열 수 있게 함
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash === "dental" || hash === "lounge") setTab(hash);
  }, []);

  // 모든 탭이 같은 폭을 씀
  const width = "max-w-5xl";

  const select = (next: Tab) => {
    setTab(next);
    history.replaceState(null, "", `#${next}`);
    window.scrollTo(0, 0);
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-700">
      <header className="sticky top-0 z-10 bg-stone-50/90 backdrop-blur border-b border-stone-200">
        <nav className={`${width} mx-auto px-4 min-h-16 py-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-1`}>
          {/* 휴대폰에서도 이름이 보이도록, 좁은 화면에서는 글자·아이콘·탭 간격을 조금 줄여 한 줄에 맞춤 */}
          <div className="flex items-center gap-1 sm:gap-3 shrink-0">
            {/* 이름을 누르면 홈(음악 탭, 맨 위)으로 */}
            <Link
              href="/"
              onClick={(e) => {
                e.preventDefault();
                setTab("music");
                history.replaceState(null, "", "/");
                window.scrollTo(0, 0);
              }}
              className="text-xs sm:text-sm font-semibold tracking-[0.1em] sm:tracking-[0.18em] uppercase text-stone-600 hover:text-stone-900 whitespace-nowrap"
            >
              {NAME_EN}
            </Link>
            <SocialLinks />
          </div>
          <div role="tablist" className="ml-auto flex shrink-0 sm:gap-1 p-1 rounded-full border border-stone-200 bg-white text-sm">
            {(["music", "dental", "lounge"] as const).map((t) => (
              <button
                key={t}
                role="tab"
                aria-selected={tab === t}
                onClick={() => select(t)}
                className={`whitespace-nowrap px-1.5 sm:px-4 py-1.5 rounded-full ${tab === t ? THEME[t].active : "text-stone-500 hover:text-stone-900"}`}
              >
                {TAB_LABELS[t]}
              </button>
            ))}
          </div>
        </nav>
      </header>

      <main role="tabpanel" className={`${width} mx-auto px-4`}>
        {tab === "music" && <MusicPanel />}
        {tab === "dental" && <DentalPanel />}
        {tab === "lounge" && <Lounge />}
      </main>

      <footer className="py-10 text-center text-sm text-stone-400">
        © {new Date().getFullYear()} {NAME_EN}
      </footer>
    </div>
  );
}
