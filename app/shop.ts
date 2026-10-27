// ── 양희본 0집 CD 판매 정보 ─────────────────────────────────────────
// 남은 수량(stock)이 바뀌면 여기 숫자만 고치면 됩니다. 0이 되면 '품절'로 표시돼요.
// 첫 화면, 구매 페이지, 라운지 공지에 같은 숫자가 함께 보여요.
export const ALBUM0 = {
  title: "양희본 0집",
  format: "CD",
  cover: "/images/album0.jpg",
  price: 10000,
  priceNote: "택배비 포함",
  stock: 369,
  total: 500, // 한정판 전체 수량
  intro:
    "기타 한 대와 목소리로 만든 노래들을 한 장의 CD에 담았습니다.",
  support: "이 CD를 구매해 주시면 다음 앨범 제작에 큰 힘이 됩니다.",
  orderForm: "https://docs.google.com/forms/d/1ZVe9iBWmSI_Enf1Es3uW0Jdx5yBZcYZkzLDJ96Ru2QY/viewform",
  bank: { name: "신한은행", account: "957-06-111158", holder: "양희본" },
};
// ────────────────────────────────────────────────────────────────

export const formatWon = (n: number) => `${n.toLocaleString("ko-KR")}원`;
