"use client";
import { ALBUM0, formatWon } from "./shop";
import LimitedStock, { useAlbumStock } from "./LimitedStock";

// 광안대교 불빛 띠: 0집 페이지(heebonmd.web.app) 다리 그림의 물에 비친 불빛을 옮겨 옴.
// 매번 같은 모양이 되도록 고정된 순서로 만든 값
const LIGHT_COLORS = ["#6FB6FF", "#EEF2FA", "#A98BFF", "#F06BC8"];
const LIGHTS = Array.from({ length: 64 }, (_, i) => {
  const r = (n: number) => ((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1 + 1) % 1;
  const zone = Math.floor(i / 8) % LIGHT_COLORS.length;
  return {
    color: r(1) < 0.25 ? "#EEF2FA" : LIGHT_COLORS[zone],
    height: 30 + Math.round(r(2) * 70),
    opacity: 0.25 + r(3) * 0.35,
  };
});

// 음악 탭 맨 위에 보이는 0집 CD 판매 안내 (0집 페이지와 같은 밤바다 색·글꼴)
export default function AlbumBanner() {
  const numbers = useAlbumStock();
  const soldOut = numbers !== null && numbers.stock <= 0;
  return (
    <section className="mt-2 mb-14 overflow-hidden rounded-2xl bg-night text-night-text">
      <div className="grid gap-6 sm:grid-cols-[180px_1fr] sm:gap-8 items-center p-5 sm:p-7">
        <a href="/shop" className="block overflow-hidden rounded-xl bg-black">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ALBUM0.cover} alt={`${ALBUM0.title} CD 표지`} className="w-full aspect-square object-cover" />
        </a>
        <div className="min-w-0">
          <p className="text-xs tracking-[0.2em] uppercase text-night-accent">{soldOut ? "Sold Out" : "Album · 한정판 CD"}</p>
          <h2 className="mt-2 font-serif text-4xl font-bold leading-tight">
            양희본 <span className="text-night-accent">0집</span>
          </h2>
          {ALBUM0.intro && <p className="mt-3 leading-relaxed text-night-sub">{ALBUM0.intro}</p>}
          <div className="mt-5">
            <LimitedStock size="sm" dark />
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-3">
            <span className="text-lg font-semibold tabular-nums">
              {formatWon(ALBUM0.price)} <span className="text-sm font-normal text-night-sub">· {ALBUM0.priceNote}</span>
            </span>
            <span className="ml-auto flex flex-wrap gap-2">
              <a
                href={ALBUM0.storyUrl}
                target="_blank"
                rel="noreferrer"
                className="px-5 py-2.5 rounded-full border border-[#4A5288] text-sm hover:border-night-accent"
              >
                0집 이야기 ↗
              </a>
              <a href="/shop" className="px-5 py-2.5 rounded-full bg-night-accent text-night text-sm font-bold hover:opacity-90">
                {soldOut ? "자세히 보기" : "구매하기"}
              </a>
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-start justify-between h-12 px-5 sm:px-7 border-t border-[#6FB6FF]/50" aria-hidden>
        {LIGHTS.map((l, i) => (
          <span
            key={i}
            className="w-[2px]"
            style={{
              height: `${l.height}%`,
              opacity: l.opacity,
              backgroundImage: `repeating-linear-gradient(to bottom, ${l.color} 0 5px, transparent 5px 8px)`,
            }}
          />
        ))}
      </div>
    </section>
  );
}
