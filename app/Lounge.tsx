"use client";
import { useEffect, useState } from "react";
import Guestbook, { formatDate } from "./Guestbook";
import { loadNotices, type Notice } from "./notices";
import { ALBUM0, formatWon } from "./shop";
import LimitedStock from "./LimitedStock";

type Board = "notices" | "guestbook";

// 공지 본문 속 http(s) 주소를 눌러서 열 수 있는 링크로 바꿈
function Linkified({ text }: { text: string }) {
  return (
    <>
      {text.split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
        /^https?:\/\//.test(part) ? (
          <a key={i} href={part} target="_blank" rel="noreferrer" className="underline underline-offset-4 hover:text-stone-900">
            {part}
          </a>
        ) : (
          part
        ),
      )}
    </>
  );
}

const BOARD_LABELS: Record<Board, string> = { notices: "공지", guestbook: "방명록" };

// 0집 CD 판매 공지: 판매 정보(app/shop.ts)로 만들어 항상 맨 위에 고정
function AlbumSaleNotice() {
  const [open, setOpen] = useState(true);
  const soldOut = ALBUM0.stock <= 0;
  return (
    <li>
      <button onClick={() => setOpen(!open)} aria-expanded={open} className="w-full flex items-center gap-3 py-5 text-left">
        <span className="shrink-0 px-2 py-0.5 rounded-full bg-stone-900 text-white text-xs">고정</span>
        <span className="flex-1 min-w-0 font-medium text-stone-900 truncate">
          💿 {ALBUM0.title} CD, 한정판 {ALBUM0.total}장 {soldOut ? "품절" : "판매 중"}
        </span>
        <span className={`shrink-0 text-stone-400 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden>
          ▾
        </span>
      </button>
      {open && (
        <div className="pb-8 grid gap-6 sm:grid-cols-[160px_1fr]">
          <a href="/shop" className="block self-start overflow-hidden rounded-xl bg-black w-40 sm:w-auto">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ALBUM0.cover} alt={`${ALBUM0.title} CD 표지`} className="w-full aspect-square object-cover" />
          </a>
          <div className="min-w-0 grid gap-4 content-start">
            {ALBUM0.intro && <p className="leading-relaxed">{ALBUM0.intro}</p>}
            <LimitedStock />
            <p className="tabular-nums">
              💰 1장 {formatWon(ALBUM0.price)} ({ALBUM0.priceNote})
            </p>
            <p className="leading-relaxed">
              구매 신청서를 작성하고 입금해 주시면, 확인되는 대로 최대한 빨리 보내드릴게요.
              <br />
              {ALBUM0.support} 😎
            </p>
            {!soldOut && (
              <a href="/shop" className="w-fit px-5 py-2.5 rounded-full bg-stone-900 text-white text-sm hover:bg-stone-700">
                구매하러 가기
              </a>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

function Notices() {
  const [notices, setNotices] = useState<Notice[] | undefined>(undefined);
  // 맨 위 판매 공지가 펼쳐져 있으니, 나머지 공지는 접힌 채로 시작
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    loadNotices().then((r) => setNotices(r.notices));
  }, []);

  if (notices === undefined) return <p className="py-6 text-stone-400">불러오는 중…</p>;

  return (
    <ul className="divide-y divide-stone-200 border-y border-stone-200">
      <AlbumSaleNotice />
      {notices.map((notice, i) => (
        <li key={notice.id ?? i}>
          <button
            onClick={() => setOpen(open === i ? null : i)}
            aria-expanded={open === i}
            className="w-full flex items-center gap-3 py-5 text-left"
          >
            {notice.pinned && (
              <span className="shrink-0 px-2 py-0.5 rounded-full bg-stone-900 text-white text-xs">고정</span>
            )}
            <span className="flex-1 min-w-0 font-medium text-stone-900 truncate">{notice.title}</span>
            <span className="shrink-0 text-sm text-stone-400 tabular-nums">{formatDate(notice.createdAt)}</span>
            <span className={`shrink-0 text-stone-400 transition-transform ${open === i ? "rotate-180" : ""}`} aria-hidden>
              ▾
            </span>
          </button>
          {open === i && <p className="pb-6 leading-relaxed whitespace-pre-wrap break-words"><Linkified text={notice.body} /></p>}
        </li>
      ))}
    </ul>
  );
}

export default function Lounge() {
  const [board, setBoard] = useState<Board>("notices");

  return (
    <div className="py-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-stone-900">라운지</h1>
          <p className="mt-2 text-stone-500">소식을 전하고, 이야기를 나누는 곳이에요.</p>
        </div>
        <div role="tablist" className="flex gap-1 p-1 rounded-full border border-stone-200 bg-white text-sm">
          {(Object.keys(BOARD_LABELS) as Board[]).map((b) => (
            <button
              key={b}
              role="tab"
              aria-selected={board === b}
              onClick={() => setBoard(b)}
              className={`px-4 py-1.5 rounded-full ${board === b ? "bg-stone-900 text-white" : "text-stone-500 hover:text-stone-900"}`}
            >
              {BOARD_LABELS[b]}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-10">{board === "notices" ? <Notices /> : <Guestbook />}</div>
    </div>
  );
}
