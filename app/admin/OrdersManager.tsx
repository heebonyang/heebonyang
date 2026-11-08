"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  increment,
  orderBy,
  query,
  serverTimestamp,
  writeBatch,
  type Timestamp,
} from "firebase/firestore/lite";
import type { FirebaseServices } from "../firebase";
import { ALBUM0, formatWon } from "../shop";
import { loadSettings, SETTINGS_DOC } from "../siteSettings";

// 0집 CD 계좌이체 주문 (0집 페이지 heebonmd.web.app 주문서에서 들어옴)
// 입금 대기(new) → 입금 확인(paid, 남은 수량이 줄어듦) → 발송 완료(shipped). 입금 대기에서만 취소(canceled) 가능.
type Status = "new" | "paid" | "shipped" | "canceled";

type Order = {
  id: string;
  name: string;
  phone: string;
  address: string;
  qty: number;
  depositor: string;
  memo: string;
  source: string;
  status: Status;
  tracking?: string;
  createdAt?: Timestamp;
};

const STATUS_LABELS: Record<Status, string> = {
  new: "입금 대기",
  paid: "발송 대기",
  shipped: "발송 완료",
  canceled: "취소",
};

const STATUS_STYLES: Record<Status, string> = {
  new: "bg-amber-100 text-amber-800",
  paid: "bg-sky-100 text-sky-800",
  shipped: "bg-stone-200 text-stone-700",
  canceled: "bg-stone-100 text-stone-400 line-through",
};

const FILTERS: (Status | "all")[] = ["new", "paid", "shipped", "canceled", "all"];

function when(t?: Timestamp) {
  if (!t) return "";
  const d = t.toDate();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

// 택배 접수용 CSV (엑셀에서 한글이 깨지지 않도록 BOM 포함)
function downloadCsv(orders: Order[]) {
  const head = ["주문일시", "상태", "이름", "연락처", "주소", "수량", "금액", "입금자명", "요청사항", "송장번호"];
  const rows = orders.map((o) => [
    when(o.createdAt),
    STATUS_LABELS[o.status],
    o.name,
    o.phone,
    o.address,
    String(o.qty),
    String(o.qty * ALBUM0.price),
    o.depositor,
    o.memo,
    o.tracking ?? "",
  ]);
  const csv = [head, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `0집-주문-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function OrderCard({
  order,
  busy,
  onAction,
}: {
  order: Order;
  busy: boolean;
  onAction: (order: Order, action: "pay" | "unpay" | "ship" | "unship" | "cancel" | "restore" | "delete", tracking?: string) => void;
}) {
  const [tracking, setTracking] = useState(order.tracking ?? "");
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const amount = order.qty * ALBUM0.price;
  const nameMismatch = order.depositor.trim() !== order.name.trim();

  const copy = async () => {
    await navigator.clipboard.writeText(`${order.name}\n${order.phone}\n${order.address}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const btn = "px-4 py-1.5 rounded-full text-sm disabled:opacity-50";
  const primary = `${btn} bg-stone-900 text-white`;
  const ghost = `${btn} border border-stone-300 text-stone-700 hover:border-stone-900`;

  return (
    <li className="rounded-2xl border border-stone-200 bg-white p-5 min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${STATUS_STYLES[order.status]}`}>{STATUS_LABELS[order.status]}</span>
          <span className="text-sm font-medium text-stone-700 tabular-nums">{order.id}</span>
          <span className="text-sm text-stone-400 tabular-nums">{when(order.createdAt)}</span>
        </div>
        <span className="font-semibold text-stone-900 tabular-nums">
          {order.qty}장 · {formatWon(amount)}
        </span>
      </div>

      <dl className="mt-4 grid grid-cols-[5rem_1fr] gap-x-3 gap-y-1.5 text-sm">
        <dt className="text-stone-400">이름</dt>
        <dd className="text-stone-900 break-words">{order.name}</dd>
        <dt className="text-stone-400">연락처</dt>
        <dd>
          <a href={`tel:${order.phone}`} className="text-stone-900 underline underline-offset-4 tabular-nums">
            {order.phone}
          </a>
        </dd>
        <dt className="text-stone-400">주소</dt>
        <dd className="text-stone-900 break-words">{order.address}</dd>
        <dt className="text-stone-400">입금자명</dt>
        <dd className={nameMismatch ? "text-amber-700 font-medium" : "text-stone-900"}>{order.depositor}</dd>
        {order.memo && (
          <>
            <dt className="text-stone-400">요청사항</dt>
            <dd className="text-stone-900 whitespace-pre-line break-words">{order.memo}</dd>
          </>
        )}
        {order.tracking && (
          <>
            <dt className="text-stone-400">송장번호</dt>
            <dd className="text-stone-900 tabular-nums">{order.tracking}</dd>
          </>
        )}
      </dl>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {order.status === "new" && (
          <>
            <button type="button" disabled={busy} className={primary} onClick={() => onAction(order, "pay")}>
              입금 확인
            </button>
            <button type="button" disabled={busy} className={ghost} onClick={() => onAction(order, "cancel")}>
              주문 취소
            </button>
          </>
        )}
        {order.status === "paid" && (
          <>
            <input
              value={tracking}
              onChange={(e) => setTracking(e.target.value)}
              placeholder="송장번호 (선택)"
              aria-label="송장번호"
              className="w-44 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm focus:outline-none focus:border-stone-900"
            />
            <button type="button" disabled={busy} className={primary} onClick={() => onAction(order, "ship", tracking.trim())}>
              발송 완료
            </button>
            <button type="button" disabled={busy} className={ghost} onClick={() => onAction(order, "unpay")}>
              입금 확인 취소
            </button>
          </>
        )}
        {order.status === "shipped" && (
          <button type="button" disabled={busy} className={ghost} onClick={() => onAction(order, "unship")}>
            발송 대기로 되돌리기
          </button>
        )}
        {order.status === "canceled" && (
          <>
            <button type="button" disabled={busy} className={ghost} onClick={() => onAction(order, "restore")}>
              입금 대기로 되돌리기
            </button>
            {confirmDelete ? (
              <button type="button" disabled={busy} className={`${btn} bg-red-700 text-white`} onClick={() => onAction(order, "delete")}>
                정말 삭제
              </button>
            ) : (
              <button type="button" disabled={busy} className={ghost} onClick={() => setConfirmDelete(true)}>
                삭제
              </button>
            )}
          </>
        )}
        <button type="button" className="ml-auto text-sm text-stone-500 underline underline-offset-4" onClick={copy}>
          {copied ? "복사했어요" : "받는 분 정보 복사"}
        </button>
      </div>
    </li>
  );
}

export default function OrdersManager({ fb }: { fb: FirebaseServices }) {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [stock, setStock] = useState<number | null>(null);
  const [filter, setFilter] = useState<Status | "all">("new");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    try {
      const [snap, settings] = await Promise.all([
        getDocs(query(collection(fb.db, "orders"), orderBy("createdAt", "desc"))),
        loadSettings({ fresh: true }),
      ]);
      setOrders(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Order, "id">) })));
      setStock(settings.albumStock);
      setError("");
    } catch {
      setOrders([]);
      setError("주문을 불러오지 못했어요. 관리자 구글 계정으로 로그인했는지 확인해 주세요.");
    }
  }, [fb]);

  useEffect(() => {
    reload();
  }, [reload]);

  const counts = useMemo(() => {
    const c: Record<Status | "all", number> = { new: 0, paid: 0, shipped: 0, canceled: 0, all: 0 };
    for (const o of orders ?? []) {
      c[o.status] += 1;
      c.all += 1;
    }
    return c;
  }, [orders]);

  const shown = (orders ?? []).filter((o) => filter === "all" || o.status === filter);
  const waitingAmount = (orders ?? []).filter((o) => o.status === "new").reduce((sum, o) => sum + o.qty * ALBUM0.price, 0);

  const act = async (
    order: Order,
    action: "pay" | "unpay" | "ship" | "unship" | "cancel" | "restore" | "delete",
    tracking?: string,
  ) => {
    if (action === "pay" && stock !== null && order.qty > stock) {
      if (!window.confirm(`남은 수량(${stock}장)보다 주문 수량(${order.qty}장)이 많아요. 그래도 입금 확인할까요?`)) return;
    }
    setBusyId(order.id);
    try {
      const ref = doc(fb.db, "orders", order.id);
      if (action === "delete") {
        await deleteDoc(ref);
      } else {
        const batch = writeBatch(fb.db);
        const settings = doc(fb.db, ...SETTINGS_DOC);
        if (action === "pay") {
          batch.update(ref, { status: "paid", paidAt: serverTimestamp() });
          batch.set(settings, { albumStock: increment(-order.qty) }, { merge: true });
        } else if (action === "unpay") {
          batch.update(ref, { status: "new" });
          batch.set(settings, { albumStock: increment(order.qty) }, { merge: true });
        } else if (action === "ship") {
          batch.update(ref, { status: "shipped", shippedAt: serverTimestamp(), tracking: tracking ?? "" });
        } else if (action === "unship") {
          batch.update(ref, { status: "paid" });
        } else if (action === "cancel") {
          batch.update(ref, { status: "canceled" });
        } else if (action === "restore") {
          batch.update(ref, { status: "new" });
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

  if (orders === null) return <p className="mt-8 text-stone-400">불러오는 중…</p>;

  return (
    <div className="mt-8 grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-stone-200 bg-white p-5">
        <p className="text-sm text-stone-600">
          입금 대기 <b className="text-stone-900 tabular-nums">{counts.new}건</b>
          {counts.new > 0 && <span className="tabular-nums"> · {formatWon(waitingAmount)}</span>}
          <span className="mx-2 text-stone-300">|</span>
          발송 대기 <b className="text-stone-900 tabular-nums">{counts.paid}건</b>
          {stock !== null && (
            <>
              <span className="mx-2 text-stone-300">|</span>
              남은 수량 <b className="text-stone-900 tabular-nums">{stock}장</b>
            </>
          )}
        </p>
        <div className="flex gap-3">
          <button type="button" onClick={reload} className="text-sm text-stone-500 underline underline-offset-4">
            새로고침
          </button>
          <button
            type="button"
            disabled={shown.length === 0}
            onClick={() => downloadCsv(shown)}
            className="text-sm text-stone-500 underline underline-offset-4 disabled:opacity-40"
          >
            엑셀(CSV) 받기
          </button>
        </div>
      </div>
      <p className="text-sm text-stone-500 -mt-2">
        &lsquo;입금 확인&rsquo;을 누르면 남은 수량이 주문 수량만큼 줄고, &lsquo;입금 확인 취소&rsquo;를 누르면 다시 늘어나요. 입금자명이 주문자 이름과 다르면 주황색으로 보여요.
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
        <p className="text-stone-400">이 상태의 주문이 없어요.</p>
      ) : (
        <ul className="grid gap-4">
          {shown.map((o) => (
            <OrderCard key={o.id} order={o} busy={busyId === o.id} onAction={act} />
          ))}
        </ul>
      )}
    </div>
  );
}
