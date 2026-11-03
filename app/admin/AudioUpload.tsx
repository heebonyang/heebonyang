"use client";
import { useRef, useState } from "react";
import { getDownloadURL, getStorage, ref, uploadBytesResumable } from "firebase/storage";
import type { FirebaseServices } from "../firebase";

// 음원 파일은 Firebase Storage의 audio/ 폴더에 저장 (storage.rules: 누구나 듣기, 관리자만 올리기)
const MAX_MB = 100;

// 파일 이름에서 주소에 문제가 될 글자만 바꿈 (한글은 그대로)
const safeName = (name: string) => name.replace(/[\\/#?%*:|"<>\s]+/g, "_");

export default function AudioUpload({
  fb,
  value,
  onChange,
}: {
  fb: FirebaseServices;
  value: string;
  onChange: (url: string) => void;
}) {
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const hasBucket = Boolean(fb.app.options.storageBucket);

  const upload = (file: File | undefined) => {
    if (!file) return;
    setError("");
    if (!file.type.startsWith("audio/")) {
      setError("음원 파일(MP3, WAV, M4A 등)만 올릴 수 있어요.");
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`${MAX_MB}MB 이하 파일만 올릴 수 있어요. 큰 WAV는 MP3로 바꿔 주세요.`);
      return;
    }
    const target = ref(getStorage(fb.app), `audio/${Date.now()}-${safeName(file.name)}`);
    const task = uploadBytesResumable(target, file, { contentType: file.type });
    setProgress(0);
    task.on(
      "state_changed",
      (s) => setProgress(Math.round((s.bytesTransferred / s.totalBytes) * 100)),
      (e) => {
        setProgress(null);
        setError(
          e.code === "storage/unauthorized"
            ? "올릴 권한이 없어요. 관리자 계정으로 로그인했는지 확인해 주세요."
            : "올리지 못했어요. Firebase 콘솔에서 Storage를 시작했는지 확인해 주세요.",
        );
      },
      async () => {
        onChange(await getDownloadURL(task.snapshot.ref));
        setProgress(null);
      },
    );
  };

  if (!hasBucket) {
    return (
      <p className="rounded-lg border border-dashed border-stone-300 bg-stone-50 px-4 py-3 text-sm text-stone-500">
        Firebase 콘솔에서 Storage를 시작하면 여기에 음원 파일을 끌어다 놓을 수 있어요.
      </p>
    );
  }

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
            음원 파일을 여기에 끌어다 놓거나 <span className="underline underline-offset-4">눌러서 고르세요</span>
            <span className="block mt-1 text-xs text-stone-400">MP3 추천 · {MAX_MB}MB 이하</span>
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
          <audio key={value} controls preload="none" src={value} className="w-full" />
          <button type="button" onClick={() => onChange("")} className="justify-self-start text-sm text-stone-500 hover:text-red-700">
            음원 빼기
          </button>
        </div>
      )}
    </div>
  );
}
