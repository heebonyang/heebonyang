import { ALBUM0, formatWon } from "./shop";
import LimitedStock from "./LimitedStock";

// 음악 탭 맨 위에 보이는 0집 CD 판매 안내
export default function AlbumBanner() {
  const soldOut = ALBUM0.stock <= 0;
  return (
    <section className="mt-2 mb-14 grid gap-6 sm:grid-cols-[180px_1fr] sm:gap-8 items-center rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
      <a href="/shop" className="block overflow-hidden rounded-xl bg-black">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={ALBUM0.cover} alt={`${ALBUM0.title} CD 표지`} className="w-full aspect-square object-cover" />
      </a>
      <div className="min-w-0">
        <p className="text-xs font-semibold tracking-[0.2em] uppercase text-amber-700">
          {soldOut ? "Sold Out" : "한정판 CD 판매 중"}
        </p>
        <h2 className="mt-2 text-3xl font-bold text-stone-900">{ALBUM0.title}</h2>
        <p className="mt-3 leading-relaxed">{ALBUM0.intro}</p>
        <div className="mt-5">
          <LimitedStock size="sm" />
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-3">
          <span className="text-lg font-semibold text-stone-900 tabular-nums">
            {formatWon(ALBUM0.price)} <span className="text-sm font-normal text-stone-500">· {ALBUM0.priceNote}</span>
          </span>
          <a
            href="/shop"
            className="ml-auto px-5 py-2.5 rounded-full bg-stone-900 text-white text-sm hover:bg-stone-700"
          >
            {soldOut ? "자세히 보기" : "구매하기"}
          </a>
        </div>
      </div>
    </section>
  );
}
