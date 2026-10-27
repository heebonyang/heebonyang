"use client";
import { useState } from "react";
import SocialLinks from "../SocialLinks";
import { ALBUM0, formatWon } from "../shop";

function CopyAccount() {
  const { name, account, holder } = ALBUM0.bank;
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(account);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 복사가 막힌 브라우저에서는 계좌번호 글자를 직접 선택할 수 있게 둠
    }
  };

  return (
    <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-stone-100 px-4 py-3">
      <span className="tabular-nums select-all">
        {name} <span className="font-semibold text-stone-900">{account}</span> {holder}
      </span>
      <button onClick={copy} className="ml-auto text-sm px-3 py-1 rounded-full border border-stone-300 bg-white hover:border-stone-900">
        {copied ? "복사했어요" : "계좌번호 복사"}
      </button>
    </div>
  );
}

export default function ShopPage() {
  const soldOut = ALBUM0.stock <= 0;

  return (
    <div className="min-h-screen bg-stone-50 text-stone-700">
      <header className="border-b border-stone-200">
        <nav className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <a href="/" className="font-bold text-stone-900 hover:text-amber-700">
            ← Heebon Yang
          </a>
          <SocialLinks />
        </nav>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-12 sm:py-16 grid gap-10 md:grid-cols-2 md:gap-14 items-start">
        <div className="overflow-hidden rounded-2xl bg-black shadow-2xl shadow-stone-400/40">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ALBUM0.cover} alt={`${ALBUM0.title} CD 표지`} className="w-full aspect-square object-cover" />
        </div>

        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-amber-700">{ALBUM0.format}</p>
          <h1 className="mt-3 text-4xl sm:text-5xl font-bold text-stone-900">{ALBUM0.title}</h1>
          <p className="mt-5 leading-relaxed">{ALBUM0.intro}</p>

          <dl className="mt-8 grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-stone-200 bg-white p-4">
              <dt className="text-sm text-stone-500">가격</dt>
              <dd className="mt-1 text-xl font-semibold text-stone-900 tabular-nums">{formatWon(ALBUM0.price)}</dd>
              <dd className="text-sm text-stone-500">{ALBUM0.priceNote}</dd>
            </div>
            <div className="rounded-xl border border-stone-200 bg-white p-4">
              <dt className="text-sm text-stone-500">남은 수량</dt>
              <dd className="mt-1 text-xl font-semibold text-stone-900 tabular-nums">
                {soldOut ? "품절" : `${ALBUM0.stock}장`}
              </dd>
            </div>
          </dl>

          {soldOut ? (
            <p className="mt-10 rounded-xl border border-stone-200 bg-white p-5">
              준비한 CD가 모두 판매됐어요. 사랑해 주셔서 고맙습니다.
            </p>
          ) : (
            <>
              <h2 className="mt-12 text-xl font-bold text-stone-900">구매 방법</h2>
              <ol className="mt-5 grid gap-6">
                <li className="flex gap-4">
                  <span className="shrink-0 grid place-items-center w-7 h-7 rounded-full bg-stone-900 text-white text-sm">1</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-stone-900">구매 신청서를 작성해 주세요</p>
                    <p className="mt-1 text-sm text-stone-500">구글 폼으로 연결돼요.</p>
                    <a
                      href={ALBUM0.orderForm}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-block px-5 py-2.5 rounded-full bg-stone-900 text-white text-sm hover:bg-stone-700"
                    >
                      구매 신청서 작성하기
                    </a>
                  </div>
                </li>
                <li className="flex gap-4">
                  <span className="shrink-0 grid place-items-center w-7 h-7 rounded-full bg-stone-900 text-white text-sm">2</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-stone-900">아래 계좌로 입금해 주세요</p>
                    <p className="mt-1 text-sm text-stone-500 tabular-nums">
                      1장당 {formatWon(ALBUM0.price)} ({ALBUM0.priceNote})
                    </p>
                    <CopyAccount />
                  </div>
                </li>
                <li className="flex gap-4">
                  <span className="shrink-0 grid place-items-center w-7 h-7 rounded-full bg-stone-900 text-white text-sm">3</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-stone-900">입금이 확인되면 최대한 빨리 보내드려요</p>
                  </div>
                </li>
              </ol>
            </>
          )}

          <p className="mt-10 text-stone-500">{ALBUM0.support}</p>
        </div>
      </main>
    </div>
  );
}
