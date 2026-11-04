"use client";
import { useEffect, useRef, useState } from "react";
import { getFirebase } from "./firebase";
import { audioUrl, computePeaks, isDbAudio, loadPeaks, PEAK_BARS } from "./audioStore";

// 한 번에 한 곡만: 어떤 곡이 재생되면 다른 플레이어는 멈춤
let current: HTMLAudioElement | null = null;

const fmt = (sec: number) => {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  return `${m}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;
};

// 파형 막대 + 재생 버튼 플레이어. 파형을 누르면 그 위치로 이동.
// 데이터베이스에 올린 곡은 처음 재생을 누를 때 받아 옴 (방문만 해서는 곡을 받지 않음)
export default function AudioPlayer({ src, className = "" }: { src: string; className?: string }) {
  const audio = useRef<HTMLAudioElement>(null);
  const wantPlay = useRef(false);
  const [url, setUrl] = useState<string | null>(isDbAudio(src) ? null : src);
  const [peaks, setPeaks] = useState<number[] | undefined>(undefined);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    let alive = true;
    getFirebase().then((fb) => loadPeaks(fb, src)).then((p) => alive && p && setPeaks(p));
    return () => {
      alive = false;
    };
  }, [src]);

  // 받아 온 뒤 바로 재생
  useEffect(() => {
    if (url && wantPlay.current) {
      wantPlay.current = false;
      audio.current?.play().catch(() => {});
    }
  }, [url]);

  const toggle = async () => {
    const el = audio.current;
    if (url && el) {
      if (el.paused) el.play().catch(() => {});
      else el.pause();
      return;
    }
    setState("loading");
    try {
      const fb = await getFirebase();
      if (!fb) throw new Error("no firebase");
      const blobUrl = await audioUrl(fb, src);
      // 예전에 올려 파형 정보가 없는 곡은 받은 파일로 파형을 그림
      if (!peaks) fetch(blobUrl).then((r) => r.arrayBuffer()).then(computePeaks).then((p) => p && setPeaks(p));
      wantPlay.current = true;
      setUrl(blobUrl);
      setState("idle");
    } catch {
      setState("error");
    }
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = audio.current;
    if (!el || !duration) return;
    const r = e.currentTarget.getBoundingClientRect();
    el.currentTime = Math.min(duration, Math.max(0, ((e.clientX - r.left) / r.width) * duration));
  };
  const seekKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const el = audio.current;
    if (!el || !duration) return;
    if (e.key === "ArrowRight") el.currentTime = Math.min(duration, el.currentTime + 5);
    else if (e.key === "ArrowLeft") el.currentTime = Math.max(0, el.currentTime - 5);
    else return;
    e.preventDefault();
  };

  const played = duration ? time / duration : 0;
  const bars = peaks ?? Array.from({ length: PEAK_BARS }, () => 0.15);

  return (
    <div className={className}>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggle}
          disabled={state === "loading"}
          aria-label={playing ? "일시정지" : "재생"}
          className="shrink-0 grid place-items-center w-11 h-11 rounded-full bg-stone-900 text-white hover:bg-stone-700 disabled:opacity-60"
        >
          {state === "loading" ? (
            <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" aria-hidden />
          ) : playing ? (
            <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden>
              <rect x="3.5" y="2.5" width="3" height="11" rx="1" />
              <rect x="9.5" y="2.5" width="3" height="11" rx="1" />
            </svg>
          ) : (
            <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden>
              <path d="M4.5 2.5v11l9-5.5z" />
            </svg>
          )}
        </button>
        <div
          role="slider"
          tabIndex={duration ? 0 : -1}
          aria-label="재생 위치"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          aria-valuenow={Math.round(time)}
          aria-valuetext={`${fmt(time)} / ${fmt(duration)}`}
          onClick={seek}
          onKeyDown={seekKey}
          className={`flex-1 min-w-0 flex items-center gap-[2px] h-10 ${duration ? "cursor-pointer" : ""}`}
        >
          {bars.map((v, i) => (
            <span
              key={i}
              className={`flex-1 rounded-full transition-colors ${(i + 0.5) / bars.length <= played ? "bg-amber-700" : "bg-stone-300"}`}
              style={{ height: `${Math.max(8, v * 100)}%` }}
            />
          ))}
        </div>
        <span className="shrink-0 w-[4.5rem] text-right text-xs text-stone-500 tabular-nums">
          {fmt(time)} / {fmt(duration)}
        </span>
      </div>
      {state === "error" && <p className="mt-2 text-sm text-red-700">음원을 불러오지 못했어요. 잠시 후 다시 눌러 주세요.</p>}
      <audio
        ref={audio}
        src={url ?? undefined}
        preload="metadata"
        onPlay={(e) => {
          if (current && current !== e.currentTarget) current.pause();
          current = e.currentTarget;
          setPlaying(true);
        }}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onDurationChange={(e) => setDuration(e.currentTarget.duration)}
      />
    </div>
  );
}
