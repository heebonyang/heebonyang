"use client";
import { useState } from "react";
import { MUSIC_PROFILE, type Release, type Team } from "./music";
import { useMusicData } from "./musicData";

type Category = "solo" | "team";

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

export function Cover({ release, index, large = false }: { release: Release; index: number; large?: boolean }) {
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
      <span className={`tracking-[0.25em] uppercase opacity-70 ${large ? "text-xs" : "text-[10px]"}`}>{release.team || "Heebon Yang"}</span>
      <span className={`font-semibold leading-tight ${large ? "text-3xl" : "text-base"}`}>{release.title}</span>
    </div>
  );
}

function Featured({ release, index, isLatest }: { release: Release; index: number; isLatest: boolean }) {
  const links = PLATFORMS.filter((p) => release.links?.[p.key]);
  return (
    <div className="grid gap-8 md:grid-cols-2 md:gap-12 items-center">
      <div className="overflow-hidden rounded-2xl shadow-2xl shadow-stone-400/40">
        <Cover release={release} index={index} large />
      </div>

      <div className="min-w-0">
        <p className="text-xs font-semibold tracking-[0.2em] uppercase text-amber-700">
          {release.team ? `Team Project · ${release.team}` : isLatest ? "Latest Release" : "Release"}
        </p>
        <h2 className="mt-3 text-4xl sm:text-5xl font-bold text-stone-900 leading-tight">{release.title}</h2>
        <p className="mt-3 text-sm text-stone-500 tabular-nums">
          {release.type} · {release.date} · {release.tracks.length}곡
        </p>
        {release.description && <p className="mt-6 leading-relaxed">{release.description}</p>}

        {release.audio && (
          // key: 다른 음원을 고르면 플레이어를 새로 만들어 이전 곡 재생을 멈춤
          <audio key={release.audio} controls preload="none" src={release.audio} className="mt-6 w-full">
            브라우저가 오디오 재생을 지원하지 않아요.
          </audio>
        )}

        <ol className="mt-6 border-t border-stone-200">
          {release.tracks.map((track, i) => (
            <li key={i} className="flex gap-4 py-2.5 border-b border-stone-200 text-sm">
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

// releases 안의 위치(index)를 그대로 넘겨서, 어느 카테고리에서 골라도 상단에 같은 음원이 뜨게 함
function indexesOf(releases: Release[], match: (r: Release) => boolean) {
  return releases.flatMap((r, i) => (match(r) ? [i] : []));
}

function ReleaseGrid({
  releases,
  indexes,
  selected,
  onChoose,
}: {
  releases: Release[];
  indexes: number[];
  selected: number;
  onChoose: (i: number) => void;
}) {
  return (
    <ul className="mt-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-10">
      {indexes.map((i) => {
        const release = releases[i];
        return (
          <li key={release.id ?? release.title + release.date}>
            <button onClick={() => onChoose(i)} className="group block w-full text-left">
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
        );
      })}
    </ul>
  );
}

function Discography({
  releases,
  teams,
  selected,
  onChoose,
}: {
  releases: Release[];
  teams: Team[];
  selected: number;
  onChoose: (i: number) => void;
}) {
  const [category, setCategory] = useState<Category>("solo");
  const soloCount = releases.filter((r) => !r.team).length;

  return (
    <section className="mt-20 py-14 border-t border-stone-200">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-stone-900">Discography</h2>
        <div role="tablist" className="flex gap-1 p-1 rounded-full border border-stone-200 bg-white text-sm">
          {(["solo", "team"] as const).map((c) => (
            <button
              key={c}
              role="tab"
              aria-selected={category === c}
              onClick={() => setCategory(c)}
              className={`px-4 py-1.5 rounded-full tabular-nums ${
                category === c ? "bg-stone-900 text-white" : "text-stone-500 hover:text-stone-900"
              }`}
            >
              {c === "solo" ? `솔로 ${soloCount}` : `팀 프로젝트 ${releases.length - soloCount}`}
            </button>
          ))}
        </div>
      </div>

      {category === "solo" ? (
        <ReleaseGrid releases={releases} indexes={indexesOf(releases, (r) => !r.team)} selected={selected} onChoose={onChoose} />
      ) : teams.length === 0 ? (
        <p className="mt-8 text-stone-500">아직 등록된 팀 프로젝트가 없어요.</p>
      ) : (
        <div className="mt-4 divide-y divide-stone-200">
          {teams.map((team) => (
            <div key={team.id ?? team.name} className="py-10">
              <div className="grid gap-2 md:grid-cols-[1fr_2fr] md:gap-10">
                <div>
                  <h3 className="text-xl font-bold text-stone-900">{team.name}</h3>
                  <p className="mt-1 text-sm text-stone-500 tabular-nums">
                    {team.period} · {team.role}
                  </p>
                </div>
                {team.description && <p className="leading-relaxed">{team.description}</p>}
              </div>
              <ReleaseGrid
                releases={releases}
                indexes={indexesOf(releases, (r) => r.team === team.name)}
                selected={selected}
                onChoose={onChoose}
              />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default function MusicPanel() {
  const data = useMusicData();
  const [chosen, setChosen] = useState<number | null>(null);

  const choose = (i: number) => {
    setChosen(i);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const releases = data?.releases ?? [];
  // 처음 크게 보여줄 음원: 가장 최근 솔로 음원 (솔로가 없으면 가장 최근 음원)
  const latestSolo = Math.max(0, releases.findIndex((r) => !r.team));
  const selected = chosen ?? latestSolo;

  return (
    <>
      <div className="pt-12 pb-10 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h1 className="text-2xl font-bold text-stone-900">{MUSIC_PROFILE.name}</h1>
        <p className="text-stone-500">{MUSIC_PROFILE.tagline}</p>
      </div>

      {!data ? (
        <div className="grid gap-8 md:grid-cols-2 md:gap-12" aria-label="불러오는 중">
          <div className="aspect-square rounded-2xl bg-stone-200 animate-pulse" />
          <div className="space-y-4 self-center">
            <div className="h-4 w-32 rounded bg-stone-200 animate-pulse" />
            <div className="h-10 w-3/4 rounded bg-stone-200 animate-pulse" />
            <div className="h-4 w-1/2 rounded bg-stone-200 animate-pulse" />
          </div>
        </div>
      ) : releases.length === 0 ? (
        <p className="py-20 text-center text-stone-500">곧 음원 소식을 전할게요.</p>
      ) : (
        <>
          <Featured release={releases[selected]} index={selected} isLatest={selected === latestSolo} />
          <Discography releases={releases} teams={data.teams} selected={selected} onChoose={choose} />
        </>
      )}

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
