"use client";
import { useEffect, useState } from "react";
import MusicPanel from "./MusicPanel";
import Guestbook from "./Guestbook";

// ── 치과 탭 내용 (음악 탭 내용은 app/music.ts) ──────────────────────
// 음악과 치과는 서로 완전히 분리된 탭으로, 내용이 섞이지 않습니다.
const NAME_EN = "Heebon Yang";

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

type Tab = "music" | "dental" | "guestbook";

const TAB_LABELS: Record<Tab, string> = { music: "음악", dental: "치과", guestbook: "방명록" };

const THEME = {
  music:  { tag: "bg-amber-100 text-amber-800", eyebrow: "text-amber-700", active: "bg-amber-700 text-white" },
  dental: { tag: "bg-sky-100 text-sky-800",     eyebrow: "text-sky-700",   active: "bg-sky-700 text-white" },
  guestbook: { tag: "bg-stone-200 text-stone-800", eyebrow: "text-stone-600", active: "bg-stone-900 text-white" },
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

  // #music / #dental / #guestbook 주소로 바로 해당 탭을 열 수 있게 함
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash === "dental" || hash === "guestbook") setTab(hash);
  }, []);

  // 음악 탭은 앨범 커버 그리드를 위해 더 넓게 씀
  const width = tab === "music" ? "max-w-5xl" : "max-w-3xl";

  const select = (next: Tab) => {
    setTab(next);
    history.replaceState(null, "", `#${next}`);
    window.scrollTo(0, 0);
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-700">
      <header className="sticky top-0 z-10 bg-stone-50/90 backdrop-blur border-b border-stone-200">
        <nav className={`${width} mx-auto px-4 h-16 flex items-center justify-between`}>
          <span className="font-bold text-stone-900">{NAME_EN}</span>
          <div role="tablist" className="flex gap-1 p-1 rounded-full border border-stone-200 bg-white text-sm">
            {(["music", "dental", "guestbook"] as const).map((t) => (
              <button
                key={t}
                role="tab"
                aria-selected={tab === t}
                onClick={() => select(t)}
                className={`px-3 sm:px-4 py-1.5 rounded-full ${tab === t ? THEME[t].active : "text-stone-500 hover:text-stone-900"}`}
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
        {tab === "guestbook" && <Guestbook />}
      </main>

      <footer className="py-10 text-center text-sm text-stone-400">
        © {new Date().getFullYear()} {NAME_EN}
      </footer>
    </div>
  );
}
