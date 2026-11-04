"use client";
import { useState } from "react";
import { getFirebase } from "./firebase";
import { audioUrl, isDbAudio } from "./audioStore";

// 사이트에 함께 올라간 음원은 바로 재생 칸을 보여 주고,
// 데이터베이스에 올린 음원은 '듣기'를 눌렀을 때만 받아서 재생 (방문할 때마다 곡을 받지 않도록)
export default function AudioPlayer({ src, className = "" }: { src: string; className?: string }) {
  const [url, setUrl] = useState<string | null>(isDbAudio(src) ? null : src);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");

  if (url) {
    return (
      <audio key={url} controls preload="none" autoPlay={isDbAudio(src)} src={url} className={`w-full ${className}`}>
        브라우저가 오디오 재생을 지원하지 않아요.
      </audio>
    );
  }

  const load = async () => {
    setState("loading");
    try {
      const fb = await getFirebase();
      if (!fb) throw new Error("no firebase");
      setUrl(await audioUrl(fb, src));
    } catch {
      setState("error");
    }
  };

  return (
    <div className={className}>
      <button
        type="button"
        onClick={load}
        disabled={state === "loading"}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-stone-300 text-sm text-stone-700 hover:border-stone-900 disabled:opacity-60"
      >
        <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor" aria-hidden>
          <path d="M4 2.5v11l9-5.5z" />
        </svg>
        {state === "loading" ? "불러오는 중…" : "듣기"}
      </button>
      {state === "error" && <p className="mt-2 text-sm text-red-700">음원을 불러오지 못했어요. 잠시 후 다시 눌러 주세요.</p>}
    </div>
  );
}
