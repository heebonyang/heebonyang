"use client";
import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  type Timestamp,
} from "firebase/firestore/lite";
import { getFirebase } from "./firebase";

export type GuestbookEntry = { id: string; name: string; message: string; createdAt: Timestamp | null };

export const NAME_MAX = 30;
export const MESSAGE_MAX = 500;

export async function loadGuestbook(): Promise<GuestbookEntry[] | null> {
  const fb = await getFirebase();
  if (!fb) return null;
  try {
    const snap = await getDocs(query(collection(fb.db, "guestbook"), orderBy("createdAt", "desc"), limit(200)));
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<GuestbookEntry, "id">) }));
  } catch {
    return null;
  }
}

export function formatDate(ts: Timestamp | null) {
  if (!ts) return "";
  const d = ts.toDate();
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

export default function Guestbook() {
  // undefined: 불러오는 중 / null: 방명록을 쓸 수 없는 상태
  const [entries, setEntries] = useState<GuestbookEntry[] | null | undefined>(undefined);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  useEffect(() => {
    loadGuestbook().then(setEntries);
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fb = await getFirebase();
    if (!fb || !name.trim() || !message.trim()) return;
    setStatus("sending");
    try {
      await addDoc(collection(fb.db, "guestbook"), {
        name: name.trim(),
        message: message.trim(),
        createdAt: serverTimestamp(),
      });
      setMessage("");
      setStatus("sent");
      setEntries(await loadGuestbook());
    } catch {
      setStatus("error");
    }
  };

  return (
    <div>
      <p className="text-stone-500">노래 감상, 응원, 안부 무엇이든 남겨 주세요.</p>

      {entries === null ? (
        <p className="mt-6 rounded-xl border border-stone-200 bg-white p-6 text-stone-500">
          방명록을 준비하고 있어요. 조금만 기다려 주세요.
        </p>
      ) : (
        <>
          <form onSubmit={submit} className="mt-6 rounded-2xl border border-stone-200 bg-white p-6 grid gap-4">
            <label className="grid gap-1.5">
              <span className="text-sm text-stone-500">이름</span>
              <input
                id="guestbook-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={NAME_MAX}
                required
                className="rounded-lg border border-stone-300 px-3 py-2 focus:outline-none focus:border-stone-900"
              />
            </label>
            <label className="grid gap-1.5">
              <span className="flex justify-between text-sm text-stone-500">
                <span>메시지</span>
                <span className="tabular-nums">
                  {message.length}/{MESSAGE_MAX}
                </span>
              </span>
              <textarea
                id="guestbook-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={MESSAGE_MAX}
                rows={4}
                required
                className="rounded-lg border border-stone-300 px-3 py-2 resize-y focus:outline-none focus:border-stone-900"
              />
            </label>
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-stone-500">
                {status === "sent" && "남겨 주셔서 고마워요."}
                {status === "error" && <span className="text-red-700">등록하지 못했어요. 잠시 후 다시 시도해 주세요.</span>}
              </span>
              <button
                type="submit"
                disabled={status === "sending"}
                className="px-5 py-2 rounded-full bg-stone-900 text-white text-sm hover:bg-stone-700 disabled:opacity-50"
              >
                {status === "sending" ? "남기는 중…" : "남기기"}
              </button>
            </div>
          </form>

          <ul className="mt-12 divide-y divide-stone-200 border-t border-stone-200">
            {entries === undefined && <li className="py-6 text-stone-400">불러오는 중…</li>}
            {entries?.length === 0 && <li className="py-6 text-stone-500">첫 번째 글을 남겨 주세요.</li>}
            {entries?.map((entry) => (
              <li key={entry.id} className="py-6">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="font-medium text-stone-900">{entry.name}</span>
                  <span className="text-sm text-stone-400 tabular-nums">{formatDate(entry.createdAt)}</span>
                </div>
                <p className="mt-2 leading-relaxed whitespace-pre-wrap break-words">{entry.message}</p>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
