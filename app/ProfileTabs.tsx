"use client";
import { useEffect, useState } from "react";
import MusicPanel from "./MusicPanel";
import Lounge from "./Lounge";
import SocialLinks from "./SocialLinks";
import { useSiteSettings } from "./siteSettings";

// ── 치과 탭 내용 (음악 탭 내용은 app/music.ts) ──────────────────────
// 음악과 치과는 서로 완전히 분리된 탭으로, 내용이 섞이지 않습니다.
const NAME_EN = "Heebon Yang";

const DENTAL = {
  role: "치과의사",
  title: "양희본",
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

type Tab = "music" | "dental" | "lounge";

const TAB_LABELS: Record<Tab, string> = { music: "음악", dental: "치과", lounge: "라운지" };

const THEME = {
  music:  { role: "text-amber-700", eyebrow: "text-amber-700", active: "bg-amber-700 text-white" },
  dental: { role: "text-sky-700",   eyebrow: "text-sky-700",   active: "bg-sky-700 text-white" },
  lounge: { role: "text-stone-600", eyebrow: "text-stone-600", active: "bg-stone-900 text-white" },
};

// tagline(머리글)은 관리자 페이지 '머리글'에서 수정
function Hero({ tab, role, title, tagline, about }: { tab: Tab; role: string; title: string; tagline?: string; about: string }) {
  return (
    <div className="pt-12 pb-16">
      {/* 이름 앞에 탭 색으로 직업을 붙여 씀 (음악 탭과 같은 크기) */}
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h1 className="text-2xl font-bold text-stone-900">
          <span className={THEME[tab].role}>{role}</span> {title}
        </h1>
        <p className="text-stone-500">{tagline}</p>
      </div>
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
  const settings = useSiteSettings();
  return (
    <>
      <Hero tab="dental" {...DENTAL} tagline={settings?.dentalTagline} />
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
          {/* 좁은 화면에서는 이름을 숨겨 SNS 아이콘과 탭이 한 줄에 들어가게 함 */}
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden sm:inline font-bold text-stone-900">{NAME_EN}</span>
            <SocialLinks />
          </div>
          <div role="tablist" className="flex gap-1 p-1 rounded-full border border-stone-200 bg-white text-sm">
            {(["music", "dental", "lounge"] as const).map((t) => (
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
        {tab === "lounge" && <Lounge />}
      </main>

      <footer className="py-10 text-center text-sm text-stone-400">
        © {new Date().getFullYear()} {NAME_EN}
      </footer>
    </div>
  );
}
