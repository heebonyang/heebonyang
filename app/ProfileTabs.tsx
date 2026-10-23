"use client";
import { useEffect, useState } from "react";

// ── 여기 내용만 수정하면 페이지가 바뀝니다 ─────────────────────────
// 음악과 치과는 서로 완전히 분리된 탭으로, 내용이 섞이지 않습니다.
const NAME_EN = "Heebon Yang";

const MUSIC = {
  role: "싱어송라이터",
  title: "양희본",
  tagline: "일상의 이야기를 노래로 만듭니다.",
  about:
    "어쿠스틱 기타 한 대로 시작한 노래들입니다. 직접 쓰고, 직접 부르고, 가끔 작은 무대에 섭니다.",
  songs: [
    { title: "첫 번째 곡", year: "2025", note: "디지털 싱글" },
    { title: "두 번째 곡", year: "2024", note: "EP 수록곡" },
    { title: "세 번째 곡", year: "2023", note: "데뷔 싱글" },
  ],
  links: [
    { label: "YouTube", href: "#" },
    { label: "Melon", href: "#" },
    { label: "Spotify", href: "#" },
  ],
  contact: [
    { label: "Instagram", href: "#" },
    { label: "Email", href: "mailto:music@example.com" },
  ],
};

const DENTAL = {
  role: "치과의사",
  title: "양희본 원장",
  tagline: "환자의 이야기를 먼저 듣는 진료를 합니다.",
  about:
    "충분히 설명하고, 꼭 필요한 치료만 권합니다. 치료가 끝난 뒤에도 편하게 다시 찾을 수 있는 치과를 지향합니다.",
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

type Tab = "music" | "dental";

const THEME = {
  music:  { tag: "bg-amber-100 text-amber-800", eyebrow: "text-amber-700", active: "bg-amber-700 text-white", btn: "border-amber-700 text-amber-800 hover:bg-amber-50" },
  dental: { tag: "bg-sky-100 text-sky-800",     eyebrow: "text-sky-700",   active: "bg-sky-700 text-white",   btn: "border-sky-700 text-sky-800 hover:bg-sky-50" },
};

function Hero({ tab, role, title, tagline, about }: { tab: Tab; role: string; title: string; tagline: string; about: string }) {
  return (
    <div className="py-20">
      <span className={`px-3 py-1 rounded-full text-sm ${THEME[tab].tag}`}>{role}</span>
      <h1 className="mt-6 text-4xl sm:text-5xl font-bold text-stone-900">{title}</h1>
      <p className="mt-4 text-xl text-stone-600">{tagline}</p>
      <p className="mt-8 leading-relaxed max-w-prose">{about}</p>
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

function LinkButtons({ tab, links }: { tab: Tab; links: { label: string; href: string }[] }) {
  return (
    <div className="flex flex-wrap gap-3">
      {links.map((link) => (
        <a key={link.label} href={link.href} className={`px-4 py-2 rounded-lg border bg-white text-sm ${THEME[tab].btn}`}>
          {link.label}
        </a>
      ))}
    </div>
  );
}

function MusicPanel() {
  return (
    <>
      <Hero tab="music" {...MUSIC} />
      <Section tab="music" eyebrow="Songs" title="발표한 곡">
        <ul className="divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white">
          {MUSIC.songs.map((song) => (
            <li key={song.title} className="flex flex-wrap items-center justify-between gap-x-4 px-5 py-4">
              <span className="font-medium text-stone-900">{song.title}</span>
              <span className="text-sm text-stone-500">{song.note} · {song.year}</span>
            </li>
          ))}
        </ul>
        <div className="mt-6"><LinkButtons tab="music" links={MUSIC.links} /></div>
      </Section>
      <Section tab="music" eyebrow="Contact" title="공연·협업 문의">
        <LinkButtons tab="music" links={MUSIC.contact} />
      </Section>
    </>
  );
}

function DentalPanel() {
  return (
    <>
      <Hero tab="dental" {...DENTAL} />
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

  // #music / #dental 주소로 바로 해당 탭을 열 수 있게 함
  useEffect(() => {
    if (window.location.hash === "#dental") setTab("dental");
  }, []);

  const select = (next: Tab) => {
    setTab(next);
    history.replaceState(null, "", `#${next}`);
    window.scrollTo(0, 0);
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-700">
      <header className="sticky top-0 z-10 bg-stone-50/90 backdrop-blur border-b border-stone-200">
        <nav className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <span className="font-bold text-stone-900">{NAME_EN}</span>
          <div role="tablist" className="flex gap-1 p-1 rounded-full border border-stone-200 bg-white text-sm">
            {(["music", "dental"] as const).map((t) => (
              <button
                key={t}
                role="tab"
                aria-selected={tab === t}
                onClick={() => select(t)}
                className={`px-4 py-1.5 rounded-full ${tab === t ? THEME[t].active : "text-stone-500 hover:text-stone-900"}`}
              >
                {t === "music" ? "음악" : "치과"}
              </button>
            ))}
          </div>
        </nav>
      </header>

      <main role="tabpanel" className="max-w-3xl mx-auto px-4">
        {tab === "music" ? <MusicPanel /> : <DentalPanel />}
      </main>

      <footer className="py-10 text-center text-sm text-stone-400">
        © {new Date().getFullYear()} {NAME_EN}
      </footer>
    </div>
  );
}
