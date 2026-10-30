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
  support: "이 CD를 구매해 주시면 다음 앨범 제작에 큰 힘이 됩니다.",
  orderForm: "https://docs.google.com/forms/d/1ZVe9iBWmSI_Enf1Es3uW0Jdx5yBZcYZkzLDJ96Ru2QY/viewform",
  bank: { name: "신한은행", account: "957-06-111158", holder: "양희본" },
};
// ────────────────────────────────────────────────────────────────

export const formatWon = (n: number) => `${n.toLocaleString("ko-KR")}원`;
