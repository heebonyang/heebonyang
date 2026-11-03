"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, type User } from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getFirebase, type FirebaseServices } from "../firebase";

// 서버 함수(functions/src/index.ts)와 같은 모양
type Song = { title: string; style: string; lyrics: string; exclude_styles: string; instrumental: boolean; notes: string };
// Claude API 메시지를 그대로 주고받는다 (서버가 만든 내용을 다음 요청에 다시 보냄)
type ApiMessage = { role: "user" | "assistant"; content: string | { type: string; text?: string }[] };
type ChatResult = { messages: ApiMessage[]; song: Song | null; notice?: string };
type StatusResult = { status: string; done: boolean; failed: boolean; error: string; audio: string[] };
type Generation = { taskId: string; status: string; audio: string[]; error: string };

const REGION = "asia-northeast3";
const POLL_MS = 15000;

function call<T>(fb: FirebaseServices, data: unknown): Promise<T> {
  const fn = httpsCallable(getFunctions(fb.app, REGION), "sunoFactory", { timeout: 310_000 });
  return fn(data).then((r) => r.data as T);
}

function errorText(e: unknown) {
  const code = (e as { code?: string })?.code ?? "";
  if (code.endsWith("permission-denied")) return "이 계정으로는 수노 공장을 쓸 수 없어요.";
  return (e as { message?: string })?.message || "요청하지 못했어요. 잠시 후 다시 시도해 주세요.";
}

// 화면에 보여 줄 말풍선: 사용자 입력과 Claude의 글만 (도구 호출·결과는 숨김)
function bubbles(messages: ApiMessage[]) {
  const out: { role: "user" | "assistant"; text: string }[] = [];
  for (const m of messages) {
    if (typeof m.content === "string") out.push({ role: m.role, text: m.content });
    else if (m.role === "assistant") {
      const text = m.content.filter((b) => b.type === "text").map((b) => b.text ?? "").join("").trim();
      if (text) out.push({ role: "assistant", text });
    }
  }
  return out;
}

function CopyBox({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="grid gap-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-stone-500">{label}</span>
        <button
          onClick={() => navigator.clipboard.writeText(value).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); })}
          className="text-stone-500 hover:text-stone-900"
        >
          {copied ? "복사됨" : "복사"}
        </button>
      </div>
      <pre className="whitespace-pre-wrap break-words rounded-lg bg-stone-100 p-3 text-sm text-stone-800">{value}</pre>
    </div>
  );
}

export default function SunoFactory() {
  const [fb, setFb] = useState<FirebaseServices | null | undefined>(undefined);
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [messages, setMessages] = useState<ApiMessage[]>([]);
  const [song, setSong] = useState<Song | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [generations, setGenerations] = useState<Generation[]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let unsubscribe = () => {};
    getFirebase().then((services) => {
      setFb(services);
      if (services) unsubscribe = onAuthStateChanged(getAuth(services.app), setUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [messages, busy]);

  // 생성 중인 곡의 상태를 15초마다 확인
  const pending = generations.filter((g) => !g.audio.length && !g.error).map((g) => g.taskId).join(",");
  useEffect(() => {
    if (!fb || !pending) return;
    const timer = setInterval(() => {
      for (const taskId of pending.split(",")) {
        call<StatusResult>(fb, { action: "status", taskId })
          .then((r) =>
            setGenerations((gs) =>
              gs.map((g) =>
                g.taskId !== taskId ? g : {
                  ...g,
                  status: r.status,
                  audio: r.done ? r.audio : [],
                  error: r.failed ? `생성 실패 (${r.status}) ${r.error}` : r.done && !r.audio.length ? "완료됐지만 오디오 주소가 없어요." : "",
                },
              ),
            ),
          )
          .catch((e) => setGenerations((gs) => gs.map((g) => (g.taskId === taskId ? { ...g, error: errorText(e) } : g))));
      }
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [fb, pending]);

  const send = async () => {
    const text = input.trim();
    if (!fb || !text || busy) return;
    const next: ApiMessage[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setBusy(true);
    setError("");
    try {
      const r = await call<ChatResult>(fb, { action: "chat", messages: next });
      setMessages(r.messages);
      if (r.song) setSong(r.song);
      if (r.notice) setError(r.notice);
    } catch (e) {
      setMessages(messages); // 실패한 입력은 되돌려서 다시 보낼 수 있게
      setInput(text);
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const generate = async () => {
    if (!fb || !song) return;
    if (!confirm(`'${song.title}'을(를) Suno로 생성할까요?\nsunoapi.org 크레딧이 차감됩니다.`)) return;
    setError("");
    try {
      const { taskId } = await call<{ taskId: string }>(fb, { action: "generate", song });
      setGenerations((gs) => [{ taskId, status: "PENDING", audio: [], error: "" }, ...gs]);
    } catch (e) {
      setError(errorText(e));
    }
  };

  const login = () => fb && signInWithPopup(getAuth(fb.app), new GoogleAuthProvider()).catch(() => setError("로그인하지 못했어요. 팝업 차단을 해제하고 다시 시도해 주세요."));

  return (
    <div className="min-h-screen bg-stone-50 text-stone-700">
      <header className="border-b border-stone-200 bg-white">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <span className="font-bold text-stone-900">🏭 수노 공장</span>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/" className="text-stone-500 hover:text-stone-900">사이트 보기</Link>
            {fb && user && (
              <button onClick={() => signOut(getAuth(fb.app))} className="text-stone-500 hover:text-stone-900">로그아웃</button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {fb === undefined || (fb && user === undefined) ? (
          <p className="text-stone-400">불러오는 중…</p>
        ) : fb === null ? (
          <p className="rounded-xl border border-amber-300 bg-amber-50 p-5 text-amber-900">
            Firebase 설정을 찾지 못했어요. 배포된 사이트(heebonyang.web.app/suno)에서 열어 주세요.
          </p>
        ) : !user ? (
          <div className="max-w-sm mx-auto mt-16 text-center">
            <h1 className="text-2xl font-bold text-stone-900">수노 공장</h1>
            <p className="mt-3 text-stone-500">Claude와 대화하며 Suno 곡을 만들어요. 구글 계정으로 로그인해 주세요.</p>
            <button onClick={login} className="mt-8 px-6 py-3 rounded-full bg-stone-900 text-white">Google 계정으로 로그인</button>
            {error && <p className="mt-4 text-sm text-red-700">{error}</p>}
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* 대화 */}
            <section className="flex flex-col rounded-2xl border border-stone-200 bg-white min-h-[60vh]">
              <div className="flex-1 overflow-y-auto p-4 grid content-start gap-3 max-h-[70vh]">
                {messages.length === 0 && (
                  <p className="text-stone-400 text-sm">예: 비 오는 새벽에 듣는 잔잔한 시티팝, 여자 보컬, 한국어 가사</p>
                )}
                {bubbles(messages).map((b, i) => (
                  <p
                    key={i}
                    className={`whitespace-pre-wrap rounded-2xl px-4 py-2.5 max-w-[85%] ${
                      b.role === "user" ? "justify-self-end bg-stone-900 text-white" : "justify-self-start bg-stone-100 text-stone-800"
                    }`}
                  >
                    {b.text}
                  </p>
                ))}
                {busy && <p className="text-sm text-stone-400">곡을 쓰는 중… (1분 정도 걸릴 수 있어요)</p>}
                <div ref={endRef} />
              </div>
              <form
                onSubmit={(e) => { e.preventDefault(); send(); }}
                className="flex gap-2 border-t border-stone-200 p-3"
              >
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); } }}
                  rows={2}
                  placeholder="어떤 곡을 만들까요?"
                  className="flex-1 resize-none rounded-lg border border-stone-300 px-3 py-2 focus:outline-none focus:border-stone-900"
                />
                <button disabled={busy || !input.trim()} className="px-4 rounded-lg bg-stone-900 text-white disabled:opacity-40">보내기</button>
              </form>
              {error && <p className="px-4 pb-3 text-sm text-red-700">{error}</p>}
            </section>

            {/* 곡 초안과 생성 결과 */}
            <section className="grid content-start gap-4">
              {!song ? (
                <p className="rounded-2xl border border-dashed border-stone-300 p-6 text-sm text-stone-400">
                  곡 초안이 여기에 나타나요.
                </p>
              ) : (
                <div className="grid gap-4 rounded-2xl border border-stone-200 bg-white p-5">
                  <h2 className="text-xl font-bold text-stone-900">{song.title}</h2>
                  <CopyBox label="Style of Music" value={song.style} />
                  {song.exclude_styles && <CopyBox label="Exclude Styles" value={song.exclude_styles} />}
                  {song.instrumental ? <p className="text-sm">연주곡 (Instrumental 켜기)</p> : <CopyBox label="Lyrics" value={song.lyrics} />}
                  {song.notes && <p className="text-sm text-stone-500">{song.notes}</p>}
                  <button onClick={generate} className="justify-self-start px-5 py-2.5 rounded-full bg-stone-900 text-white">
                    Suno로 생성하기
                  </button>
                  <p className="text-xs text-stone-400">
                    비공식 서비스 sunoapi.org를 써요(유료). 직접 만들려면 위 내용을 복사해 suno.com Custom 모드에 붙여넣으세요.
                  </p>
                </div>
              )}

              {generations.map((g) => (
                <div key={g.taskId} className="rounded-2xl border border-stone-200 bg-white p-5 grid gap-3">
                  <p className="text-sm text-stone-500">
                    {g.error ? <span className="text-red-700">{g.error}</span> : g.audio.length ? "완성!" : `생성 중… (${g.status || "대기"}, 보통 2~5분)`}
                  </p>
                  {g.audio.map((url) => (
                    <div key={url} className="flex items-center gap-3">
                      <audio controls src={url} className="flex-1 min-w-0" />
                      <a href={url} target="_blank" rel="noreferrer" className="text-sm text-stone-500 hover:text-stone-900">받기</a>
                    </div>
                  ))}
                </div>
              ))}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
