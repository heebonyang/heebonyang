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
  // 0집 소개 페이지 (표지를 누르면 열림)
  storeUrl: "https://heebonmd.web.app",
  // 홈페이지 음악 탭에서 바로 쓰는 주문서 (0집 페이지 주문서와 같은 곳에 저장, 관리자 '0집 주문'에서 확인)
  maxQty: 10,
  bank: "신한은행 957-06-111158 양희본",
};
// ────────────────────────────────────────────────────────────────

export const formatWon = (n: number) => `${n.toLocaleString("ko-KR")}원`;
