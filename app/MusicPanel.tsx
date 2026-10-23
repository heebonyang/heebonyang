"use client";
import { useState } from "react";
import { MUSIC_PROFILE, RELEASES, type Release } from "./music";

const PLATFORMS: { key: keyof Release["links"]; label: string }[] = [
  { key: "melon", label: "Melon" },
  { key: "spotify", label: "Spotify" },
  { key: "apple", label: "Apple Music" },
  { key: "youtube", label: "YouTube" },
];

// 커버 이미지가 없을 때 쓰는 임시 커버 색 (발매 순서대로 돌아가며 사용)
const PLACEHOLDER_TONES = [
  "from-stone-800 to-stone-600",
  "from-amber-900 to-amber-700",
  "from-slate-700 to-slate-500",
  "from-stone-500 to-stone-400",
  "from-neutral-800 to-amber-900",
  "from-zinc-600 to-zinc-400",
];

function Cover({ release, index, large = false }: { release: Release; index: number; large?: boolean }) {
  if (release.cover) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={release.cover} alt={`${release.title} 커버`} className="w-full aspect-square object-cover" />
    );
  }
  return (
    <div
      className={`w-full aspect-square bg-gradient-to-br ${PLACEHOLDER_TONES[index % PLACEHOLDER_TONES.length]} flex flex-col justify-between text-white ${large ? "p-8" : "p-4"}`}
    >
      <span className={`tracking-[0.25em] uppercase opacity-70 ${large ? "text-xs" : "text-[10px]"}`}>Heebon Yang</span>
      <span className={`font-semibold leading-tight ${large ? "text-3xl" : "text-base"}`}>{release.title}</span>
    </div>
  );
}

function Featured({ release, index }: { release: Release; index: number }) {
  const links = PLATFORMS.filter((p) => release.links[p.key]);
  return (
    <div className="grid gap-8 md:grid-cols-2 md:gap-12 items-center">
      <div className="overflow-hidden rounded-2xl shadow-2xl shadow-stone-400/40">
        <Cover release={release} index={index} large />
      </div>

      <div className="min-w-0">
        <p className="text-xs font-semibold tracking-[0.2em] uppercase text-amber-700">
          {index === 0 ? "Latest Release" : "Release"}
        </p>
        <h2 className="mt-3 text-4xl sm:text-5xl font-bold text-stone-900 leading-tight">{release.title}</h2>
        <p className="mt-3 text-sm text-stone-500 tabular-nums">
          {release.type} · {release.date} · {release.tracks.length}곡
        </p>
        {release.description && <p className="mt-6 leading-relaxed">{release.description}</p>}

        <ol className="mt-6 border-t border-stone-200">
          {release.tracks.map((track, i) => (
            <li key={track} className="flex gap-4 py-2.5 border-b border-stone-200 text-sm">
              <span className="w-5 text-right text-stone-400 tabular-nums">{i + 1}</span>
              <span className="text-stone-800">{track}</span>
            </li>
          ))}
        </ol>

        {links.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2">
            {links.map((p, i) => (
              <a
                key={p.key}
                href={release.links[p.key]}
                target="_blank"
                rel="noreferrer"
                className={`px-4 py-2 rounded-full text-sm transition-colors ${
                  i === 0
                    ? "bg-stone-900 text-white hover:bg-stone-700"
                    : "border border-stone-300 text-stone-700 hover:border-stone-900"
                }`}
              >
                {i === 0 ? `${p.label}에서 듣기` : p.label}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function MusicPanel() {
  const [selected, setSelected] = useState(0);

  const choose = (i: number) => {
    setSelected(i);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      <div className="pt-12 pb-10 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h1 className="text-2xl font-bold text-stone-900">{MUSIC_PROFILE.name}</h1>
        <p className="text-stone-500">{MUSIC_PROFILE.tagline}</p>
      </div>

      <Featured release={RELEASES[selected]} index={selected} />

      <section className="mt-20 py-14 border-t border-stone-200">
        <div className="flex items-baseline justify-between">
          <h2 className="text-2xl font-bold text-stone-900">Discography</h2>
          <span className="text-sm text-stone-500 tabular-nums">{RELEASES.length} releases</span>
        </div>
        <ul className="mt-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-10">
          {RELEASES.map((release, i) => (
            <li key={release.title + release.date}>
              <button onClick={() => choose(i)} className="group block w-full text-left">
                <div
                  className={`overflow-hidden rounded-xl transition duration-200 group-hover:-translate-y-1 group-hover:shadow-xl ${
                    i === selected ? "ring-2 ring-amber-700 ring-offset-4 ring-offset-stone-50" : ""
                  }`}
                >
                  <Cover release={release} index={i} />
                </div>
                <p className="mt-3 font-medium text-stone-900 truncate">{release.title}</p>
                <p className="text-sm text-stone-500 tabular-nums">
                  {release.type} · {release.date.slice(0, 4)}
                </p>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="py-14 border-t border-stone-200 grid gap-10 md:grid-cols-2">
        <div>
          <h2 className="text-xl font-bold text-stone-900">About</h2>
          <p className="mt-4 leading-relaxed">{MUSIC_PROFILE.about}</p>
        </div>
        <div>
          <h2 className="text-xl font-bold text-stone-900">공연·협업 문의</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {MUSIC_PROFILE.contact.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="px-4 py-2 rounded-full border border-stone-300 text-sm hover:border-stone-900"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
