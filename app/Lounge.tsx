"use client";
import { useEffect, useState } from "react";
import Guestbook, { formatDate } from "./Guestbook";
import { loadNotices, type Notice } from "./notices";

type Board = "notices" | "guestbook";

const BOARD_LABELS: Record<Board, string> = { notices: "공지", guestbook: "방명록" };

function Notices() {
  const [notices, setNotices] = useState<Notice[] | undefined>(undefined);
  const [open, setOpen] = useState<number | null>(0);

  useEffect(() => {
    loadNotices().then((r) => setNotices(r.notices));
  }, []);

  if (notices === undefined) return <p className="py-6 text-stone-400">불러오는 중…</p>;
  if (notices.length === 0) return <p className="py-6 text-stone-500">아직 공지가 없어요.</p>;

  return (
    <ul className="divide-y divide-stone-200 border-y border-stone-200">
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
          {open === i && <p className="pb-6 leading-relaxed whitespace-pre-wrap break-words">{notice.body}</p>}
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
