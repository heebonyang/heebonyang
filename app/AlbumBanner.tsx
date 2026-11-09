"use client";
import { ALBUM0, formatWon } from "./shop";
import LimitedStock, { useAlbumStock } from "./LimitedStock";

// 음악 탭 맨 위에 보이는 0집 CD 판매 안내
// 0집 판매 페이지(heebonmd.web.app)와 같은 색·글꼴·구성으로 맞춤
export default function AlbumBanner() {
  const numbers = useAlbumStock();
  const soldOut = numbers !== null && numbers.stock <= 0;
  return (
    <section className="mt-2 mb-14 grid gap-6 sm:grid-cols-[200px_1fr] sm:gap-10 items-center rounded border border-album-line bg-album-cream p-5 sm:p-8 text-album-ink">
      <a href={ALBUM0.storeUrl} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-sm bg-black">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={ALBUM0.cover} alt={`${ALBUM0.title} CD 표지`} className="w-full aspect-square object-cover" />
      </a>
      <div className="min-w-0">
        <p className="text-sm tracking-[0.2em] text-album-navy">{soldOut ? "SOLD OUT" : "LIMITED CD"}</p>
        <h2 className="mt-2 font-serif text-4xl sm:text-5xl font-bold leading-tight tracking-tight">
          양희본 <span className="text-album-navy">0집</span>
        </h2>
        {ALBUM0.intro && <p className="mt-3 leading-relaxed text-album-sub">{ALBUM0.intro}</p>}
        <div className="mt-5">
          <LimitedStock />
        </div>
        <div className="mt-5 pt-5 border-t border-album-line flex flex-wrap items-center gap-x-5 gap-y-3">
          <span className="text-lg font-medium tabular-nums">
            {formatWon(ALBUM0.price)} · {ALBUM0.priceNote}
          </span>
          <a
            href={ALBUM0.storeUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center min-h-[48px] px-6 rounded-full bg-album-navy text-white font-bold hover:opacity-90"
          >
            {soldOut ? "자세히 보기" : "음반 구매하기"}
          </a>
        </div>
      </div>
    </section>
  );
}
