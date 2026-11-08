import { useSiteSettings } from "./siteSettings";

// 0집 남은 수량 (불러오기 전에는 null). 관리자 페이지 '0집 CD'에서 정한 숫자
export function useAlbumStock() {
  const settings = useSiteSettings();
  return settings ? { stock: settings.albumStock, total: settings.albumTotal } : null;
}

// 한정판 남은 수량 게이지: "남은 369 / 500장" + 막대
export default function LimitedStock({ size = "md" }: { size?: "sm" | "md" }) {
  const numbers = useAlbumStock();
  // 숫자를 불러오는 동안에는 같은 높이의 빈 자리만 둠 (예전 숫자가 잠깐 보이지 않도록)
  if (!numbers) return <div className={size === "md" ? "h-[60px]" : "h-[52px]"} aria-hidden />;
  const { stock, total } = numbers;
  const left = Math.max(0, Math.min(stock, total));
  const percent = total > 0 ? (left / total) * 100 : 0;
  const soldOut = left === 0;

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="inline-flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-stone-900 text-white text-[11px] font-semibold tracking-[0.15em] uppercase">
            Limited
          </span>
          <span className="text-sm font-medium text-stone-900">한정판 {total}장</span>
        </span>
        <span className={`tabular-nums text-stone-900 ${size === "md" ? "text-2xl" : "text-lg"} font-bold`}>
          {soldOut ? (
            "품절"
          ) : (
            <>
              <span className="text-amber-700">{left}</span>
              <span className="text-stone-400 font-normal"> / {total}장 남음</span>
            </>
          )}
        </span>
      </div>
      <div
        className={`mt-2 w-full overflow-hidden rounded-full bg-stone-200 ${size === "md" ? "h-3" : "h-2"}`}
        role="meter"
        aria-label="남은 수량"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={left}
      >
        <div className="h-full rounded-full bg-amber-600" style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-1.5 text-xs text-stone-500 tabular-nums">
        {soldOut ? "준비한 CD가 모두 판매됐어요." : `${total - left}장 판매 · 한정 수량이라 다 팔리면 판매가 끝나요`}
      </p>
    </div>
  );
}
