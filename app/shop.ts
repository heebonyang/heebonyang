// ── 양희본 0집 CD 판매 정보 ─────────────────────────────────────────
// 남은 수량은 관리자 페이지 '0집 CD'에서 바꿉니다. 아래 stock/total은 한 번도 저장하지 않았을 때의 기본값이에요.
export const ALBUM0 = {
  title: "양희본 0집",
  format: "CD",
  cover: "/images/album0.jpg",
  price: 10000,
  priceNote: "택배비 포함",
  stock: 369,
  total: 500, // 한정판 전체 수량
  intro: "", // 앨범 소개글 (비워 두면 화면에 표시되지 않음)
  // 구매는 0집 페이지에서 (계좌이체 주문서, 주문은 관리자 페이지 '0집 주문'에서 확인)
  storeUrl: "https://heebonmd.web.app",
  // 주문서가 바로 펼쳐지는 주소 (from=shop: 홈페이지에서 온 주문으로 표시)
  orderUrl: "https://heebonmd.web.app/?from=shop#order",
};
// ────────────────────────────────────────────────────────────────

export const formatWon = (n: number) => `${n.toLocaleString("ko-KR")}원`;
