"use client";
import { useEffect, useRef, useState } from "react";
import { doc, serverTimestamp, setDoc } from "firebase/firestore/lite";
import { getFirebase } from "./firebase";
import { ALBUM0, formatWon } from "./shop";

// 0집 CD 주문서: 음악 탭 0집 배너의 '음반 구매하기'를 누르면 배너 아래에 펼쳐짐.
// 0집 페이지(heebonmd.web.app) 주문서와 같은 칸·같은 저장 위치(orders, source "shop")라서
// 관리자 페이지 '0집 주문'에서 함께 확인됨. 저장 조건은 firestore.rules 의 orders 규칙.

// 주문번호: 날짜 + 헷갈리지 않는 글자 5개 (예: 261109-K7QRM)
function orderNo() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const buf = new Uint32Array(5);
  crypto.getRandomValues(buf);
  return `${String(d.getFullYear()).slice(2)}${p(d.getMonth() + 1)}${p(d.getDate())}-${Array.from(buf, (x) => abc[x % abc.length]).join("")}`;
}

const field =
  "w-full rounded border border-album-edge bg-album-field px-3.5 py-3 text-base text-album-ink focus:outline focus:outline-2 focus:outline-offset-1 focus:outline-album-navy";
const label = "block mb-1.5 text-sm font-medium text-album-sub";
const hint = "ml-1.5 text-xs font-normal text-album-muted";

type Done = { no: string; amount: number; qty: number; depositor: string; sign: string };

export default function AlbumOrder({ stock, onClose }: { stock: number; onClose: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [qty, setQty] = useState(1);
  const [sign, setSign] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Done | null>(null);
  const [copied, setCopied] = useState(false);
  const maxQty = Math.max(1, Math.min(ALBUM0.maxQty, stock));

  // 펼쳐지면 주문서가 보이는 곳까지 부드럽게 내려감 (휴대폰 키보드가 저절로 올라오지 않게 입력 칸은 누르지 않음)
  useEffect(() => {
    box.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [done]);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy) return;
    const f = new FormData(e.currentTarget);
    const v = (k: string) => String(f.get(k) ?? "").trim();
    const name = v("name");
    const phone = v("phone").replace(/[\s.]/g, "");
    const address = v("address");
    const depositor = v("depositor") || name;
    const signName = v("signName");
    let memo = v("memo");
    if (!name) return setError("이름을 적어 주세요.");
    if (!/^[0-9][0-9-]{8,13}$/.test(phone)) return setError("연락처를 숫자로 적어 주세요. (예: 010-1234-5678)");
    if (address.length < 5) return setError("받는 주소를 적어 주세요.");
    if (!f.get("agree")) return setError("개인정보 수집·이용에 동의해 주셔야 주문할 수 있어요.");
    // 싸인 요청은 관리자 '0집 주문'에서 바로 보이도록 요청사항 맨 앞에 붙임 (0집 페이지와 같은 방식)
    if (sign) memo = (`[싸인 요청${signName ? ` · 이름: ${signName}` : ""}]` + (memo ? `\n${memo}` : "")).slice(0, 300);

    setError("");
    setBusy(true);
    try {
      const fb = await getFirebase();
      if (!fb) throw new Error("offline");
      const no = orderNo();
      await setDoc(doc(fb.db, "orders", no), {
        name,
        phone,
        address,
        qty,
        depositor,
        memo,
        source: "shop",
        status: "new",
        agree: true,
        createdAt: serverTimestamp(),
      });
      setDone({
        no,
        amount: qty * ALBUM0.price,
        qty,
        depositor,
        sign: sign ? `비닐 뜯고 싸인해서 보내 드려요${signName ? ` (${signName} 님께)` : ""}` : "",
      });
    } catch (err) {
      setError(
        (err as { code?: string })?.code === "permission-denied"
          ? "주문을 넣지 못했어요. 남은 수량보다 많이 주문했거나 입력한 내용에 문제가 있어요. 수량과 연락처를 확인해 주세요."
          : "주문을 넣지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.",
      );
    } finally {
      setBusy(false);
    }
  };

  const copyBank = async () => {
    try {
      await navigator.clipboard.writeText(ALBUM0.bank.replace(/[^\d-]/g, "").replace(/^-+|-+$/g, ""));
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div ref={box} className="scroll-mt-24 -mt-10 mb-14 rounded border border-album-line bg-album-cream p-5 sm:p-8 font-kr text-album-ink">
      {done ? (
        <div className="grid gap-4">
          <p className="text-sm tracking-[0.2em] text-album-navy">THANK YOU</p>
          <h3 className="font-serif text-2xl font-bold">주문이 접수됐어요.</h3>
          <p className="text-album-sub">아래 계좌로 입금해 주시면, 확인 후 보내드릴게요.</p>
          <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-2">
            <dt className="text-album-muted">주문번호</dt>
            <dd className="font-medium tabular-nums">{done.no}</dd>
            <dt className="text-album-muted">입금 금액</dt>
            <dd className="font-medium tabular-nums">
              {formatWon(done.amount)} ({done.qty}장)
            </dd>
            <dt className="text-album-muted">입금자명</dt>
            <dd className="font-medium">{done.depositor}</dd>
            {done.sign && (
              <>
                <dt className="text-album-muted">싸인</dt>
                <dd className="font-medium">{done.sign}</dd>
              </>
            )}
            <dt className="text-album-muted">입금 계좌</dt>
            <dd className="font-medium">
              {ALBUM0.bank}{" "}
              <button type="button" onClick={copyBank} className="ml-1 text-sm text-album-navy underline underline-offset-4">
                {copied ? "복사했어요" : "복사"}
              </button>
            </dd>
          </dl>
          <p className="text-sm text-album-muted">이 화면을 캡처해 두시면 편해요. 문의할 때 주문번호를 알려 주세요.</p>
          <button
            type="button"
            onClick={onClose}
            className="justify-self-start min-h-[52px] px-7 rounded-full border border-album-edge text-album-ink hover:border-album-navy"
          >
            닫기
          </button>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="grid gap-5">
          <div>
            <p className="text-sm tracking-[0.2em] text-album-navy">ORDER</p>
            <h3 className="mt-1 font-serif text-2xl font-bold">
              양희본 <span className="text-album-navy">0집</span> 주문서
            </h3>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="o-name" className={label}>이름</label>
              <input id="o-name" name="name" autoComplete="name" maxLength={30} className={field} />
            </div>
            <div>
              <label htmlFor="o-phone" className={label}>연락처</label>
              <input id="o-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="010-1234-5678" maxLength={14} className={field} />
            </div>
          </div>
          <div>
            <label htmlFor="o-address" className={label}>
              받는 주소<span className={hint}>우편번호가 있으면 함께 적어 주세요</span>
            </label>
            <textarea id="o-address" name="address" autoComplete="street-address" maxLength={200} rows={2} className={`${field} resize-y`} />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <span id="o-qty" className={label}>수량</span>
              <div role="group" aria-labelledby="o-qty" className="inline-flex items-center rounded border border-album-edge bg-album-field">
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  disabled={qty <= 1}
                  aria-label="한 장 빼기"
                  className="w-12 h-12 text-xl text-album-navy disabled:text-album-edge"
                >
                  −
                </button>
                <output aria-live="polite" className="min-w-11 text-center text-lg font-bold tabular-nums">{qty}</output>
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
                  disabled={qty >= maxQty}
                  aria-label="한 장 더하기"
                  className="w-12 h-12 text-xl text-album-navy disabled:text-album-edge"
                >
                  +
                </button>
              </div>
            </div>
            <div>
              <label htmlFor="o-depositor" className={label}>
                입금자명<span className={hint}>주문자와 다를 때만</span>
              </label>
              <input id="o-depositor" name="depositor" maxLength={30} className={field} />
            </div>
          </div>
          <div className="grid gap-3 rounded border border-album-edge bg-album-field px-4 py-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={sign} onChange={(e) => setSign(e.target.checked)} className="mt-1 w-5 h-5 accent-album-navy shrink-0" />
              <span>
                <b className="block font-medium">비닐 뜯고 싸인해서 보내 주세요</b>
                <span className="block text-sm text-album-muted">원하시면 비닐을 뜯고 자켓에 직접 싸인해 드려요. (무료)</span>
              </span>
            </label>
            {sign && (
              <div>
                <label htmlFor="o-signname" className={label}>
                  싸인에 넣을 이름<span className={hint}>선택 · 비워 두면 싸인만 해 드려요</span>
                </label>
                <input id="o-signname" name="signName" maxLength={20} className={field} />
              </div>
            )}
          </div>
          <div>
            <label htmlFor="o-memo" className={label}>
              요청사항<span className={hint}>선택</span>
            </label>
            <textarea id="o-memo" name="memo" maxLength={300} rows={2} className={`${field} resize-y`} />
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-3 border-t border-album-line pt-4">
            <span className="text-album-muted">
              입금하실 금액 <small>({ALBUM0.priceNote})</small>
            </span>
            <b className="text-2xl tabular-nums">{formatWon(qty * ALBUM0.price)}</b>
          </div>
          <div className="flex items-start gap-2.5">
            <input id="o-agree" name="agree" type="checkbox" className="mt-0.5 w-5 h-5 accent-album-navy shrink-0" />
            <div className="text-[15px] text-album-sub">
              <label htmlFor="o-agree">[필수] 개인정보 수집·이용에 동의해요</label>
              <details className="mt-1 text-[13px] text-album-muted">
                <summary className="cursor-pointer text-album-sub">자세히 보기</summary>
                <ul className="mt-2 list-disc pl-4">
                  <li>수집 항목: 이름, 연락처, 주소, 입금자명, 요청사항</li>
                  <li>이용 목적: 입금 확인, 음반 발송, 주문 관련 연락</li>
                  <li>보관 기간: 발송 완료 후 1년 (법령에 따라 보관해야 하는 경우 그 기간)</li>
                  <li>동의하지 않으실 수 있지만, 이 경우 주문할 수 없어요.</li>
                </ul>
              </details>
            </div>
          </div>
          {error && (
            <p role="alert" className="text-[15px] text-[#B3261E]">
              {error}
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={busy}
              className="flex-1 min-h-[52px] px-7 rounded-full bg-album-navy text-album-cream font-bold hover:opacity-90 disabled:opacity-50"
            >
              {busy ? "주문 넣는 중…" : "주문하기"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="min-h-[52px] px-7 rounded-full border border-album-edge text-album-ink hover:border-album-navy"
            >
              닫기
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
