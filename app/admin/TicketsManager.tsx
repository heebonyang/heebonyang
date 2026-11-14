"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, serverTimestamp, writeBatch, type Timestamp } from "firebase/firestore/lite";
import type { FirebaseServices } from "../firebase";
import { formatWon } from "../shop";

// 공연 좌석 예매 (0집 페이지 heebonmd.web.app 예매서에서 들어옴, 계좌이체)
// 입금 대기(new) → 예매 확정(paid). 취소하면 좌석이 다시 풀려서 다른 분이 예매할 수 있음.
// 고른 좌석은 concertSeats/{좌석} 문서로도 저장돼 있어서, 배치도의 분홍 좌석이 됨.
type Status = "new" | "paid" | "canceled";

type Ticket = {
  id: string;
  name: string;
  phone: string;
  seats: string[];
  qty: number;
  depositor: string;
  memo: string;
  status: Status;
  createdAt?: Timestamp;
};

const STATUS_LABELS: Record<Status, string> = { new: "입금 대기", paid: "예매 확정", canceled: "취소" };
const STATUS_STYLES: Record<Status, string> = {
  new: "bg-amber-100 text-amber-800",
  paid: "bg-pink-100 text-pink-800",
  canceled: "bg-stone-100 text-stone-400 line-through",
};
const FILTERS: (Status | "all")[] = ["new", "paid", "canceled", "all"];

function when(t?: Timestamp) {
  if (!t) return "";
  const d = t.toDate();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

// 공연 당일 명단용 CSV (엑셀에서 한글이 깨지지 않도록 BOM 포함)
function downloadCsv(tickets: Ticket[], price: number) {
  const head = ["예매일시", "상태", "예매번호", "이름", "연락처", "좌석", "매수", "금액", "입금자명", "요청사항"];
  const rows = tickets.map((t) => [
    when(t.createdAt),
    STATUS_LABELS[t.status],
    t.id,
    t.name,
    t.phone,
    t.seats.join(" "),
    String(t.qty),
    price ? String(t.qty * price) : "",
    t.depositor,
    t.memo,
  ]);
  const csv = [head, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `공연-예매-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

type Action = "pay" | "unpay" | "cancel" | "delete";

function TicketCard({ ticket, price, busy, onAction }: { ticket: Ticket; price: number; busy: boolean; onAction: (t: Ticket, a: Action) => void }) {
  const [confirm, setConfirm] = useState<Action | null>(null);
  const nameMismatch = ticket.depositor.trim() !== ticket.name.trim();
  const btn = "px-4 py-1.5 rounded-full text-sm disabled:opacity-50";
  const primary = `${btn} bg-stone-900 text-white`;
  const ghost = `${btn} border border-stone-300 text-stone-700 hover:border-stone-900`;

  return (
    <li className="rounded-2xl border border-stone-200 bg-white p-5 min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${STATUS_STYLES[ticket.status]}`}>{STATUS_LABELS[ticket.status]}</span>
          <span className="text-sm font-medium text-stone-700 tabular-nums">{ticket.id}</span>
          <span className="text-sm text-stone-400 tabular-nums">{when(ticket.createdAt)}</span>
        </div>
        <span className="font-semibold text-stone-900 tabular-nums">
          {ticket.qty}석{price ? ` · ${formatWon(ticket.qty * price)}` : ""}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {ticket.seats.map((s) => (
          <span key={s} className="px-2.5 py-1 rounded-full bg-pink-500 text-white text-sm font-semibold tabular-nums">
            {s}
          </span>
        ))}
      </div>

      <dl className="mt-4 grid grid-cols-[5rem_1fr] gap-x-3 gap-y-1.5 text-sm">
        <dt className="text-stone-400">이름</dt>
        <dd className="text-stone-900 break-words">{ticket.name}</dd>
        <dt className="text-stone-400">연락처</dt>
        <dd>
          <a href={`tel:${ticket.phone}`} className="text-stone-900 underline underline-offset-4 tabular-nums">
            {ticket.phone}
          </a>
        </dd>
        <dt className="text-stone-400">입금자명</dt>
        <dd className={nameMismatch ? "text-amber-700 font-medium" : "text-stone-900"}>{ticket.depositor}</dd>
        {ticket.memo && (
          <>
            <dt className="text-stone-400">요청사항</dt>
            <dd className="text-stone-900 whitespace-pre-line break-words">{ticket.memo}</dd>
          </>
        )}
      </dl>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {ticket.status === "new" && (
          <button type="button" disabled={busy} className={primary} onClick={() => onAction(ticket, "pay")}>
            입금 확인 (예매 확정)
          </button>
        )}
        {ticket.status === "paid" && (
          <button type="button" disabled={busy} className={ghost} onClick={() => onAction(ticket, "unpay")}>
            입금 대기로 되돌리기
          </button>
        )}
        {ticket.status !== "canceled" &&
          (confirm === "cancel" ? (
            <button type="button" disabled={busy} className={`${btn} bg-red-700 text-white`} onClick={() => onAction(ticket, "cancel")}>
              정말 취소 (좌석이 다시 풀려요)
            </button>
          ) : (
            <button type="button" disabled={busy} className={ghost} onClick={() => setConfirm("cancel")}>
              예매 취소
            </button>
          ))}
        {ticket.status === "canceled" &&
          (confirm === "delete" ? (
            <button type="button" disabled={busy} className={`${btn} bg-red-700 text-white`} onClick={() => onAction(ticket, "delete")}>
              정말 삭제
            </button>
          ) : (
            <button type="button" disabled={busy} className={ghost} onClick={() => setConfirm("delete")}>
              삭제
            </button>
          ))}
      </div>
    </li>
  );
}

export default function TicketsManager({ fb }: { fb: FirebaseServices }) {
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [price, setPrice] = useState(0);
  const [totalSeats, setTotalSeats] = useState(0);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<Status | "all">("new");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    try {
      const [snap, page] = await Promise.all([
        getDocs(query(collection(fb.db, "tickets"), orderBy("createdAt", "desc"))),
        getDoc(doc(fb.db, "settings", "albumPage")),
      ]);
      setTickets(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Ticket, "id">) })));
      const concert = (page.data()?.concert ?? {}) as { ticketPrice?: number; ticketOpen?: boolean; seatRows?: number; seatsPerRow?: number };
      setPrice(Number(concert.ticketPrice) || 0);
      setOpen(concert.ticketOpen === true);
      setTotalSeats((Number(concert.seatRows) || 5) * (Number(concert.seatsPerRow) || 10));
      setError("");
    } catch {
      setTickets([]);
      setError("예매를 불러오지 못했어요. 관리자 구글 계정으로 로그인했는지 확인해 주세요.");
    }
  }, [fb]);

  useEffect(() => {
    reload();
  }, [reload]);

  const counts = useMemo(() => {
    const c: Record<Status | "all", number> = { new: 0, paid: 0, canceled: 0, all: 0 };
    for (const t of tickets ?? []) {
      c[t.status] += 1;
      c.all += 1;
    }
    return c;
  }, [tickets]);

  const seatsTaken = (tickets ?? []).filter((t) => t.status !== "canceled").reduce((n, t) => n + t.qty, 0);
  const shown = (tickets ?? []).filter((t) => filter === "all" || t.status === filter);

  const act = async (t: Ticket, action: Action) => {
    setBusyId(t.id);
    try {
      const ref = doc(fb.db, "tickets", t.id);
      if (action === "delete") {
        await deleteDoc(ref);
      } else {
        const batch = writeBatch(fb.db);
        if (action === "pay") batch.update(ref, { status: "paid", paidAt: serverTimestamp() });
        if (action === "unpay") batch.update(ref, { status: "new" });
        if (action === "cancel") {
          // 좌석을 풀어서 배치도에서 다시 예매 가능으로 보이게
          batch.update(ref, { status: "canceled", canceledAt: serverTimestamp() });
          for (const s of t.seats) batch.delete(doc(fb.db, "concertSeats", s));
        }
        await batch.commit();
      }
      await reload();
    } catch {
      setError("저장하지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setBusyId(null);
    }
  };

  if (tickets === null) return <p className="mt-8 text-stone-400">불러오는 중…</p>;

  return (
    <div className="mt-8 grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-stone-200 bg-white p-5">
        <p className="text-sm text-stone-600">
          예매 <b className="text-stone-900 tabular-nums">{seatsTaken}석</b>
          {totalSeats > 0 && <span className="tabular-nums"> / {totalSeats}석</span>}
          <span className="mx-2 text-stone-300">|</span>
          입금 대기 <b className="text-stone-900 tabular-nums">{counts.new}건</b>
          <span className="mx-2 text-stone-300">|</span>
          예매 받기 <b className={open ? "text-pink-700" : "text-stone-400"}>{open ? "켜짐" : "꺼짐"}</b>
        </p>
        <div className="flex gap-3">
          <button type="button" onClick={reload} className="text-sm text-stone-500 underline underline-offset-4">
            새로고침
          </button>
          <button
            type="button"
            disabled={shown.length === 0}
            onClick={() => downloadCsv(shown, price)}
            className="text-sm text-stone-500 underline underline-offset-4 disabled:opacity-40"
          >
            엑셀(CSV) 받기
          </button>
        </div>
      </div>
      <p className="text-sm text-stone-500 -mt-2">
        예매 받기·티켓 가격·좌석 수는 &lsquo;0집 페이지&rsquo; › 공연에서 바꿔요. &lsquo;예매 취소&rsquo;를 누르면 그 좌석이 다시 풀려요. 입금자명이 예매자 이름과 다르면
        주황색으로 보여요.
      </p>

      <div role="tablist" className="flex flex-wrap gap-1 p-1 w-fit rounded-full border border-stone-200 bg-white text-sm">
        {FILTERS.map((f) => (
          <button
            key={f}
            role="tab"
            aria-selected={filter === f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full ${filter === f ? "bg-stone-900 text-white" : "text-stone-500 hover:text-stone-900"}`}
          >
            {f === "all" ? "전체" : STATUS_LABELS[f]} <span className="tabular-nums opacity-70">{counts[f]}</span>
          </button>
        ))}
      </div>

      {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      {shown.length === 0 ? (
        <p className="text-stone-400">이 상태의 예매가 없어요.</p>
      ) : (
        <ul className="grid gap-4">
          {shown.map((t) => (
            <TicketCard key={t.id} ticket={t} price={price} busy={busyId === t.id} onAction={act} />
          ))}
        </ul>
      )}
    </div>
  );
}
