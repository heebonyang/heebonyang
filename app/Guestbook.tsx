"use client";
import { useEffect, useState } from "react";
import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  writeBatch,
  type Timestamp,
} from "firebase/firestore/lite";
import { getFirebase } from "./firebase";

export type GuestbookEntry = { id: string; name: string; message: string; createdAt: Timestamp | null };

export const NAME_MAX = 30;
export const MESSAGE_MAX = 500;
const PASSWORD_MIN = 4;

// 비밀번호는 글 번호와 섞어 SHA-256 해시로만 저장 (같은 비밀번호라도 글마다 다른 값이 됨)
async function hashPassword(postId: string, password: string) {
  const bytes = new TextEncoder().encode(`${postId}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

// 글과 비밀번호 해시를 한 번에 저장
async function createEntry(name: string, message: string, password: string) {
  const fb = await getFirebase();
  if (!fb) throw new Error("unavailable");
  const ref = doc(collection(fb.db, "guestbook"));
  const batch = writeBatch(fb.db);
  batch.set(ref, { name, message, createdAt: serverTimestamp() });
  batch.set(doc(fb.db, "guestbookKeys", ref.id), { hash: await hashPassword(ref.id, password) });
  await batch.commit();
}

// 비밀번호가 맞으면 삭제됨. 틀리면 규칙에 막혀 permission-denied 오류가 남
async function deleteEntry(id: string, password: string) {
  const fb = await getFirebase();
  if (!fb) throw new Error("unavailable");
  const batch = writeBatch(fb.db);
  batch.set(doc(fb.db, "guestbookUnlock", id), { hash: await hashPassword(id, password) });
  batch.delete(doc(fb.db, "guestbook", id));
  await batch.commit();
}

function DeleteControl({ id, onDeleted }: { id: string; onDeleted: () => void }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-sm text-stone-400 hover:text-red-700">
        삭제
      </button>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await deleteEntry(id, password);
      onDeleted();
    } catch (err) {
      const denied = (err as { code?: string })?.code === "permission-denied";
      setError(denied ? "비밀번호가 맞지 않아요." : "삭제하지 못했어요. 잠시 후 다시 시도해 주세요.");
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-wrap items-center justify-end gap-2 text-sm">
      <input
        id={`guestbook-delete-${id}`}
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="비밀번호"
        aria-label="글 비밀번호"
        autoFocus
        required
        className="w-28 rounded-lg border border-stone-300 px-2 py-1 focus:outline-none focus:border-stone-900"
      />
      <button type="submit" disabled={busy} className="text-red-700 font-medium disabled:opacity-50">
        삭제
      </button>
      <button
        type="button"
        onClick={() => {
          setOpen(false);
          setPassword("");
          setError("");
        }}
        className="text-stone-500"
      >
        취소
      </button>
      {error && <span className="w-full text-right text-red-700">{error}</span>}
    </form>
  );
}

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
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  useEffect(() => {
    loadGuestbook().then(setEntries);
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !message.trim() || password.length < PASSWORD_MIN) return;
    setStatus("sending");
    try {
      await createEntry(name.trim(), message.trim(), password);
      setMessage("");
      setPassword("");
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
            <div className="grid gap-4 sm:grid-cols-2">
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
                <span className="text-sm text-stone-500">
                  비밀번호 <span className="text-stone-400">· 글을 지울 때 필요해요 ({PASSWORD_MIN}자 이상)</span>
                </span>
                <input
                  id="guestbook-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={PASSWORD_MIN}
                  maxLength={50}
                  required
                  autoComplete="new-password"
                  className="rounded-lg border border-stone-300 px-3 py-2 focus:outline-none focus:border-stone-900"
                />
              </label>
            </div>
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
                  <span>
                    <span className="font-medium text-stone-900">{entry.name}</span>
                    <span className="ml-3 text-sm text-stone-400 tabular-nums">{formatDate(entry.createdAt)}</span>
                  </span>
                  <DeleteControl id={entry.id} onDeleted={() => setEntries((list) => list?.filter((x) => x.id !== entry.id))} />
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
