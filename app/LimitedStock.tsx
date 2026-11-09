import { useSiteSettings } from "./siteSettings";

// 0집 남은 수량 (불러오기 전에는 null). 관리자 페이지 '0집 CD'에서 정한 숫자
export function useAlbumStock() {
  const settings = useSiteSettings();
  return settings ? { stock: settings.albumStock, total: settings.albumTotal } : null;
}

// 한정판 남은 수량 게이지: "한정판 500장 … 369 / 500장 남음" + 막대
// 0집 판매 페이지(heebonmd.web.app)의 게이지와 같은 모양
export default function LimitedStock() {
  const numbers = useAlbumStock();
  // 숫자를 불러오는 동안에는 같은 높이의 빈 자리만 둠 (예전 숫자가 잠깐 보이지 않도록)
  if (!numbers) return <div className="h-[72px]" aria-hidden />;
  const { stock, total } = numbers;
  const left = Math.max(0, Math.min(stock, total));
  const percent = total > 0 ? (left / total) * 100 : 0;
  const soldOut = left === 0;

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-[15px] font-medium text-album-ink">
        <span>한정판 {total}장</span>
        <span className="tabular-nums">
          {soldOut ? (
            <span className="font-serif text-[28px] font-bold text-album-navy">품절</span>
          ) : (
            <>
              <span className="font-serif text-[28px] font-bold text-album-navy">{left}</span>
              <span className="text-sm font-normal text-album-muted"> / {total}장 남음</span>
            </>
          )}
        </span>
      </div>
      <div
        className="mt-2 h-2 w-full overflow-hidden rounded-full bg-album-line"
        role="meter"
        aria-label="남은 수량"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={left}
      >
        <div className="h-full rounded-full bg-album-navy" style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-1.5 text-[13px] text-album-muted tabular-nums">
        {soldOut ? "준비한 CD가 모두 판매됐어요." : `${total - left}장 판매 · 한정 수량이라 다 팔리면 판매가 끝나요`}
      </p>
    </div>
  );
}
