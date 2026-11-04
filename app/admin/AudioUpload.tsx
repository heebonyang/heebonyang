"use client";
import { useRef, useState } from "react";
import type { FirebaseServices } from "../firebase";
import AudioPlayer from "../AudioPlayer";
import { MAX_AUDIO_MB, uploadAudio } from "../audioStore";

// 음원 파일을 끌어다 놓으면 데이터베이스에 조각으로 나눠 올리고, "db:<id>" 주소를 돌려줌 (audioStore.ts)
export default function AudioUpload({
  fb,
  value,
  onChange,
}: {
  fb: FirebaseServices;
  value: string;
  onChange: (src: string) => void;
}) {
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setError("");
    if (!file.type.startsWith("audio/")) {
      setError("음원 파일(MP3, M4A 등)만 올릴 수 있어요.");
      return;
    }
    if (file.size > MAX_AUDIO_MB * 1024 * 1024) {
      setError(`${MAX_AUDIO_MB}MB 이하 파일만 올릴 수 있어요. WAV처럼 큰 파일은 MP3로 바꿔 주세요.`);
      return;
    }
    setProgress(0);
    try {
      onChange(await uploadAudio(fb, file, (r) => setProgress(Math.round(r * 100))));
    } catch (e) {
      setError(
        (e as { code?: string })?.code === "permission-denied"
          ? "올릴 권한이 없어요. 관리자 계정으로 로그인했는지 확인해 주세요."
          : "올리지 못했어요. 잠시 후 다시 시도해 주세요.",
      );
    } finally {
      setProgress(null);
    }
  };

  return (
    <div className="grid gap-2">
      <button
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          upload(e.dataTransfer.files[0]);
        }}
        disabled={progress !== null}
        className={`rounded-xl border-2 border-dashed px-4 py-6 text-sm text-center transition-colors ${
          over ? "border-stone-900 bg-stone-100" : "border-stone-300 bg-stone-50 hover:border-stone-500"
        }`}
      >
        {progress !== null ? (
          <span className="text-stone-700 tabular-nums">올리는 중… {progress}%</span>
        ) : (
          <span className="text-stone-600">
            {value ? "다른 파일로 바꾸려면 " : ""}음원 파일을 여기에 끌어다 놓거나 <span className="underline underline-offset-4">눌러서 고르세요</span>
            <span className="block mt-1 text-xs text-stone-400">MP3 추천 · {MAX_AUDIO_MB}MB 이하</span>
          </span>
        )}
      </button>
      <input
        ref={input}
        type="file"
        accept="audio/*"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          upload(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {progress !== null && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-stone-200" aria-hidden>
          <div className="h-full bg-stone-900 transition-[width]" style={{ width: `${progress}%` }} />
        </div>
      )}
      {error && <p className="text-sm text-red-700">{error}</p>}
      {value && progress === null && (
        <div className="grid gap-1">
          <AudioPlayer key={value} src={value} />
          <button type="button" onClick={() => onChange("")} className="justify-self-start text-sm text-stone-500 hover:text-red-700">
            음원 빼기
          </button>
        </div>
      )}
    </div>
  );
}
