"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, type User } from "firebase/auth";
import { addDoc, collection, deleteDoc, doc, serverTimestamp, setDoc, writeBatch } from "firebase/firestore/lite";
import { getFirebase, type FirebaseServices } from "../firebase";
import AudioUpload from "./AudioUpload";
import { deleteAudio } from "../audioStore";
import { loadDemos, type Demo } from "../demos";
import { loadMusic } from "../musicData";
import { formatDate, HeartIcon, loadGuestbook, type GuestbookEntry } from "../Guestbook";
import { RELEASES, type Release, type Team } from "../music";
import { loadNotices, STATIC_NOTICES, type Notice } from "../notices";
import { loadSettings, SETTINGS_DOC, type InfoItem, type MusicLink, type SiteSettings } from "../siteSettings";

type Section = "headings" | "bio" | "clinic" | "links" | "album" | "releases" | "demos" | "teams" | "notices" | "guestbook";

const SECTION_LABELS: Record<Section, string> = { headings: "머리글", bio: "치과 약력", clinic: "치과 정보", links: "링크", album: "0집 CD", releases: "음원", demos: "데모", teams: "팀 프로젝트", notices: "공지", guestbook: "방명록" };

const RELEASE_TYPES: Release["type"][] = ["싱글", "EP", "정규"];

// Firestore 문서 하나는 1MB까지라서, 커버 이미지는 가로세로 최대 800px JPEG로 줄여서 저장
const COVER_SIZE = 800;

function resizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, COVER_SIZE / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(img.src);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => reject(new Error("이미지를 읽지 못했어요."));
    img.src = URL.createObjectURL(file);
  });
}

function errorMessage(e: unknown) {
  const code = (e as { code?: string })?.code;
  if (code === "permission-denied") return "이 계정에는 저장 권한이 없어요. 관리자 구글 계정으로 로그인했는지 확인해 주세요.";
  return "저장하지 못했어요. 잠시 후 다시 시도해 주세요.";
}

const inputClass = "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 focus:outline-none focus:border-stone-900";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5 min-w-0">
      <span className="text-sm text-stone-600">
        {label}
        {hint && <span className="ml-2 text-stone-400">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

const emptyRelease = (): Release => ({
  title: "",
  type: "싱글",
  date: "",
  team: "",
  description: "",
  tracks: [],
  links: {},
});

function ReleaseEditor({
  fb,
  initial,
  teams,
  onSave,
  onCancel,
}: {
  fb: FirebaseServices;
  initial: Release;
  teams: Team[];
  onSave: (r: Release) => Promise<void>;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<Release>(initial);
  const [tracksText, setTracksText] = useState(initial.tracks.join("\n"));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = <K extends keyof Release>(key: K, value: Release[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const pickCover = async (file: File | undefined) => {
    if (!file) return;
    try {
      set("cover", await resizeImage(file));
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{4}\.\d{2}\.\d{2}$/.test(draft.date)) {
      setError("발매일은 2025.05.20 처럼 입력해 주세요.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave({
        ...draft,
        title: draft.title.trim(),
        tracks: tracksText.split("\n").map((t) => t.trim()).filter(Boolean),
        // 음원 사이트 링크는 더 쓰지 않음 (예전에 넣어 둔 값도 저장할 때 지움)
        links: {},
      });
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-5 rounded-2xl border border-stone-200 bg-white p-6">
      <div className="flex items-center gap-4">
        <div className="w-20 h-20 shrink-0 overflow-hidden rounded-lg bg-stone-100">
          {draft.cover && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={draft.cover} alt="커버 미리보기" className="w-full h-full object-cover" />
          )}
        </div>
        <div className="grid gap-1 text-sm">
          <span className="text-stone-600">커버 이미지 <span className="ml-1 text-stone-400">선택 · 없으면 제목으로 표시</span></span>
          <div className="flex gap-4">
            <label className="text-stone-900 underline underline-offset-4 cursor-pointer">
              {draft.cover ? "바꾸기" : "이미지 고르기"}
              <input
                id="release-cover"
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => pickCover(e.target.files?.[0])}
              />
            </label>
            {draft.cover && (
              <button type="button" onClick={() => set("cover", undefined)} className="text-stone-500 hover:text-red-700">
                지우기
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 min-w-0">
        <Field label="제목">
          <input id="release-title" required value={draft.title} onChange={(e) => set("title", e.target.value)} className={inputClass} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="종류">
            <select
              id="release-type"
              value={draft.type}
              onChange={(e) => set("type", e.target.value as Release["type"])}
              className={inputClass}
            >
              {RELEASE_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="발매일" hint="예: 2025.05.20">
            <input
              id="release-date"
              required
              value={draft.date}
              onChange={(e) => set("date", e.target.value)}
              placeholder="YYYY.MM.DD"
              className={`${inputClass} tabular-nums`}
            />
          </Field>
          <Field label="구분">
            <select id="release-team" value={draft.team ?? ""} onChange={(e) => set("team", e.target.value)} className={inputClass}>
              <option value="">솔로</option>
              {teams.map((t) => (
                <option key={t.id} value={t.name}>
                  팀 · {t.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="소개" hint="선택">
          <textarea
            id="release-description"
            rows={2}
            value={draft.description ?? ""}
            onChange={(e) => set("description", e.target.value)}
            className={inputClass}
          />
        </Field>
        <div className="grid gap-1.5 min-w-0">
          <span className="text-sm text-stone-600">
            미리듣기 음원 <span className="ml-2 text-stone-400">선택</span>
          </span>
          <AudioUpload fb={fb} value={draft.audio ?? ""} onChange={(url) => set("audio", url)} />
        </div>
        <Field label="수록곡" hint="한 줄에 한 곡씩">
          <textarea
            id="release-tracks"
            rows={4}
            value={tracksText}
            onChange={(e) => setTracksText(e.target.value)}
            className={inputClass}
          />
        </Field>

        {error && <p className="text-sm text-red-700">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="px-4 py-2 rounded-full border border-stone-300 text-sm">
            취소
          </button>
          <button type="submit" disabled={saving} className="px-5 py-2 rounded-full bg-stone-900 text-white text-sm disabled:opacity-50">
            {saving ? "저장 중…" : "저장"}
          </button>
        </div>
      </div>
    </form>
  );
}

const emptyTeam = (): Team => ({ name: "", period: "", role: "", description: "" });

function TeamEditor({
  initial,
  onSave,
  onCancel,
}: {
  initial: Team;
  onSave: (t: Team) => Promise<void>;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<Team>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = <K extends keyof Team>(key: K, value: Team[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const [over, setOver] = useState(false);

  const pickImage = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("사진 파일만 넣을 수 있어요.");
      return;
    }
    try {
      setError("");
      set("image", await resizeImage(file));
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onSave({ ...draft, name: draft.name.trim(), period: draft.period.trim(), role: draft.role.trim() });
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-4 rounded-2xl border border-stone-200 bg-white p-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="팀 이름">
          <input id="team-name" required value={draft.name} onChange={(e) => set("name", e.target.value)} className={inputClass} />
        </Field>
        <Field label="활동 기간" hint="선택 · 예: 2021 – 2023">
          <input id="team-period" value={draft.period} onChange={(e) => set("period", e.target.value)} className={inputClass} />
        </Field>
        <Field label="맡은 역할" hint="선택 · 예: 보컬 · 작곡">
          <input id="team-role" value={draft.role} onChange={(e) => set("role", e.target.value)} className={inputClass} />
        </Field>
      </div>
      <Field label="소개" hint="선택">
        <textarea
          id="team-description"
          rows={2}
          value={draft.description ?? ""}
          onChange={(e) => set("description", e.target.value)}
          className={inputClass}
        />
      </Field>
      <div className="grid gap-1.5">
        <span className="text-sm text-stone-600">
          팀 사진 <span className="ml-2 text-stone-400">선택 · 끌어다 놓거나 눌러서 고르기</span>
        </span>
        <div className="flex flex-wrap items-end gap-3">
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setOver(true);
            }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setOver(false);
              pickImage(e.dataTransfer.files[0]);
            }}
            className={`grid place-items-center w-60 aspect-[4/3] overflow-hidden rounded-xl border-2 border-dashed cursor-pointer text-sm text-stone-500 ${
              over ? "border-stone-900 bg-stone-100" : "border-stone-300 bg-stone-50 hover:border-stone-500"
            }`}
          >
            {draft.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={draft.image} alt="팀 사진 미리보기" className="w-full h-full object-cover" />
            ) : (
              <span>사진을 여기에 끌어다 놓기</span>
            )}
            <input
              id="team-image"
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                pickImage(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
          {draft.image && (
            <button type="button" onClick={() => set("image", undefined)} className="text-sm text-stone-500 hover:text-red-700">
              사진 빼기
            </button>
          )}
        </div>
      </div>
      {initial.id && initial.name !== draft.name && (
        <p className="text-sm text-amber-800">팀 이름을 바꾸면, 이 팀으로 등록된 음원의 구분도 함께 바뀌어요.</p>
      )}
      {error && <p className="text-sm text-red-700">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-full border border-stone-300 text-sm">
          취소
        </button>
        <button type="submit" disabled={saving} className="px-5 py-2 rounded-full bg-stone-900 text-white text-sm disabled:opacity-50">
          {saving ? "저장 중…" : "저장"}
        </button>
      </div>
    </form>
  );
}

const emptyNotice = (): Notice => ({ title: "", body: "", pinned: false, createdAt: null });

function NoticeEditor({
  initial,
  onSave,
  onCancel,
}: {
  initial: Notice;
  onSave: (n: Notice) => Promise<void>;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<Notice>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onSave({ ...draft, title: draft.title.trim(), body: draft.body.trim() });
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-4 rounded-2xl border border-stone-200 bg-white p-6">
      <Field label="제목">
        <input
          id="notice-title"
          required
          value={draft.title}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          className={inputClass}
        />
      </Field>
      <Field label="내용">
        <textarea
          id="notice-body"
          required
          rows={6}
          value={draft.body}
          onChange={(e) => setDraft({ ...draft, body: e.target.value })}
          className={inputClass}
        />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input
          id="notice-pinned"
          type="checkbox"
          checked={draft.pinned}
          onChange={(e) => setDraft({ ...draft, pinned: e.target.checked })}
        />
        맨 위에 고정
      </label>
      {error && <p className="text-sm text-red-700">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-full border border-stone-300 text-sm">
          취소
        </button>
        <button type="submit" disabled={saving} className="px-5 py-2 rounded-full bg-stone-900 text-white text-sm disabled:opacity-50">
          {saving ? "저장 중…" : "저장"}
        </button>
      </div>
    </form>
  );
}

// 각 탭 이름 옆에 보이는 한 줄 소개 (예: 일상의 이야기를 노래로 만듭니다.)
function HeadingsEditor({ fb }: { fb: FirebaseServices }) {
  const [draft, setDraft] = useState<SiteSettings | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    loadSettings({ fresh: true }).then(setDraft);
  }, []);

  if (!draft) return <p className="mt-8 text-stone-400">불러오는 중…</p>;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("saving");
    try {
      await setDoc(
        doc(fb.db, ...SETTINGS_DOC),
        { musicTagline: draft.musicTagline.trim(), dentalTagline: draft.dentalTagline.trim(), loungeTagline: draft.loungeTagline.trim() },
        { merge: true },
      );
      setStatus("saved");
    } catch (err) {
      setError(errorMessage(err));
      setStatus("error");
    }
  };

  return (
    <form onSubmit={submit} className="mt-8 grid gap-5 rounded-2xl border border-stone-200 bg-white p-6">
      <p className="text-sm text-stone-500">각 탭 맨 위, 이름 옆에 보이는 한 줄 소개예요. 비워 두면 표시되지 않아요.</p>
      <Field label="음악 탭" hint="양희본 싱어송라이터 옆">
        <input
          id="heading-music"
          value={draft.musicTagline}
          onChange={(e) => {
            setDraft({ ...draft, musicTagline: e.target.value });
            setStatus("idle");
          }}
          maxLength={80}
          className={inputClass}
        />
      </Field>
      <Field label="치과 탭" hint="양희본 치과의사 옆">
        <input
          id="heading-dental"
          value={draft.dentalTagline}
          onChange={(e) => {
            setDraft({ ...draft, dentalTagline: e.target.value });
            setStatus("idle");
          }}
          maxLength={80}
          className={inputClass}
        />
      </Field>
      <Field label="라운지 탭" hint="라운지 옆">
        <input
          id="heading-lounge"
          value={draft.loungeTagline}
          onChange={(e) => {
            setDraft({ ...draft, loungeTagline: e.target.value });
            setStatus("idle");
          }}
          maxLength={80}
          className={inputClass}
        />
      </Field>
      <div className="flex items-center justify-end gap-4">
        {status === "saved" && <span className="text-sm text-stone-600">저장했어요. 사이트에 바로 반영돼요.</span>}
        {status === "error" && <span className="text-sm text-red-700">{error}</span>}
        <button type="submit" disabled={status === "saving"} className="px-5 py-2 rounded-full bg-stone-900 text-white text-sm disabled:opacity-50">
          {status === "saving" ? "저장 중…" : "저장"}
        </button>
      </div>
    </form>
  );
}

// 0집 CD 남은 수량 / 전체 수량. 첫 화면과 구매 페이지의 게이지에 바로 반영됨
function AlbumStockEditor({ fb }: { fb: FirebaseServices }) {
  const [stock, setStock] = useState<string | null>(null);
  const [total, setTotal] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    loadSettings({ fresh: true }).then((s) => {
      setStock(String(s.albumStock));
      setTotal(String(s.albumTotal));
    });
  }, []);

  if (stock === null) return <p className="mt-8 text-stone-400">불러오는 중…</p>;

  const stockNum = Number(stock);
  const totalNum = Number(total);
  const valid =
    Number.isInteger(stockNum) && Number.isInteger(totalNum) && stockNum >= 0 && totalNum > 0 && stockNum <= totalNum;

  const change = (value: string) => {
    setStock(value);
    setStatus("idle");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setStatus("saving");
    try {
      await setDoc(doc(fb.db, ...SETTINGS_DOC), { albumStock: stockNum, albumTotal: totalNum }, { merge: true });
      loadSettings({ fresh: true });
      setStatus("saved");
    } catch (err) {
      setError(errorMessage(err));
      setStatus("error");
    }
  };

  return (
    <form onSubmit={submit} className="mt-8 grid gap-5 rounded-2xl border border-stone-200 bg-white p-6">
      <p className="text-sm text-stone-500">첫 화면과 구매 페이지의 &lsquo;남은 수량&rsquo; 게이지에 바로 반영돼요. 0이 되면 품절로 표시돼요.</p>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="남은 수량" hint="장">
          <input
            id="album-stock"
            type="number"
            min={0}
            value={stock}
            onChange={(e) => change(e.target.value)}
            className={`${inputClass} tabular-nums`}
          />
        </Field>
        <Field label="전체 수량 (한정판)" hint="장">
          <input
            id="album-total"
            type="number"
            min={1}
            value={total}
            onChange={(e) => {
              setTotal(e.target.value);
              setStatus("idle");
            }}
            className={`${inputClass} tabular-nums`}
          />
        </Field>
      </div>
      {!valid && <p className="text-sm text-red-700">남은 수량은 0 이상, 전체 수량 이하의 정수로 입력해 주세요.</p>}
      <div className="flex items-center justify-end gap-4">
        {status === "saved" && <span className="text-sm text-stone-600">저장했어요. 사이트에 바로 반영돼요.</span>}
        {status === "error" && <span className="text-sm text-red-700">{error}</span>}
        <button
          type="submit"
          disabled={!valid || status === "saving"}
          className="px-5 py-2 rounded-full bg-stone-900 text-white text-sm disabled:opacity-50"
        >
          {status === "saving" ? "저장 중…" : "저장"}
        </button>
      </div>
    </form>
  );
}

// 로고는 높이 최대 120px PNG로 줄여서 저장 (투명 배경 유지)
const LOGO_HEIGHT = 120;

function resizeLogo(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, LOGO_HEIGHT / img.height);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(img.src);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => reject(new Error("이미지를 읽지 못했어요."));
    img.src = URL.createObjectURL(file);
  });
}

const emptyLink = (): MusicLink => ({ name: "", url: "" });

function LinkEditor({
  initial,
  onSave,
  onCancel,
}: {
  initial: MusicLink;
  onSave: (link: MusicLink) => Promise<void>;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<MusicLink>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const pickLogo = async (file: File | undefined) => {
    if (!file) return;
    try {
      setDraft((d) => ({ ...d, logo: undefined }));
      const logo = await resizeLogo(file);
      setDraft((d) => ({ ...d, logo }));
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await onSave({ ...draft, name: draft.name.trim(), url: draft.url.trim() });
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-4 rounded-2xl border border-stone-200 bg-white p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="이름" hint="예: Melon, Spotify">
          <input id="link-name" required value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className={inputClass} />
        </Field>
        <Field label="링크 주소">
          <input
            id="link-url"
            type="url"
            required
            value={draft.url}
            onChange={(e) => setDraft({ ...draft, url: e.target.value })}
            placeholder="https://"
            className={inputClass}
          />
        </Field>
      </div>
      <div className="grid gap-2">
        <span className="text-sm text-stone-600">
          로고 이미지 <span className="ml-2 text-stone-400">선택 · 투명 배경 PNG 추천. 없으면 이름 글자로 표시돼요</span>
        </span>
        <div className="flex flex-wrap items-center gap-4">
          <div className="grid place-items-center h-16 min-w-32 rounded-xl border border-dashed border-stone-300 bg-stone-50 px-4">
            {draft.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={draft.logo} alt="로고 미리보기" className="h-8 w-auto" />
            ) : (
              <span className="text-sm text-stone-400">로고 없음</span>
            )}
          </div>
          <label className="text-sm px-4 py-2 rounded-lg border border-stone-300 cursor-pointer hover:border-stone-900">
            {draft.logo ? "다른 이미지로 바꾸기" : "이미지 선택"}
            <input
              id="link-logo"
              type="file"
              accept="image/png,image/*"
              className="sr-only"
              onChange={(e) => pickLogo(e.target.files?.[0])}
            />
          </label>
          {draft.logo && (
            <button type="button" onClick={() => setDraft({ ...draft, logo: undefined })} className="text-sm text-stone-500 hover:text-red-700">
              로고 지우기
            </button>
          )}
        </div>
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-full border border-stone-300 text-sm">
          취소
        </button>
        <button type="submit" disabled={saving} className="px-5 py-2 rounded-full bg-stone-900 text-white text-sm disabled:opacity-50">
          {saving ? "저장 중…" : "저장"}
        </button>
      </div>
    </form>
  );
}

// 음악 탭 머리글 오른쪽 바로가기 관리 (멜론 등). 목록 전체를 settings/site 문서에 저장
function LinksManager({ fb }: { fb: FirebaseServices }) {
  const [links, setLinks] = useState<MusicLink[] | null>(null);
  const [editing, setEditing] = useState<{ index: number | null; value: MusicLink } | null>(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    loadSettings({ fresh: true }).then((s) => setLinks(s.musicLinks));
  }, []);

  const saveAll = async (next: MusicLink[], message: string) => {
    // undefined 값은 저장할 수 없어서 로고가 없으면 필드를 빼고 저장
    const clean = next.map(({ name, url, logo }) => (logo ? { name, url, logo } : { name, url }));
    await setDoc(doc(fb.db, ...SETTINGS_DOC), { musicLinks: clean }, { merge: true });
    setLinks(clean);
    setEditing(null);
    setNotice(message);
    loadSettings({ fresh: true });
  };

  if (!links) return <p className="mt-8 text-stone-400">불러오는 중…</p>;

  const move = (i: number, delta: -1 | 1) => {
    const j = i + delta;
    if (j < 0 || j >= links.length) return;
    const next = [...links];
    [next[i], next[j]] = [next[j], next[i]];
    saveAll(next, "순서를 바꿨어요.").catch((e) => setNotice(errorMessage(e)));
  };

  return (
    <div className="mt-8 grid gap-6">
      <p className="text-sm text-stone-500">
        음악 탭 &lsquo;싱어송라이터 양희본&rsquo; 줄 오른쪽에 보이는 로고 링크예요. 평소엔 회색이고, 마우스를 올리면 원래 색으로 보여요.
      </p>
      {notice && <p className="rounded-lg bg-stone-100 px-4 py-3 text-sm text-stone-700">{notice}</p>}
      {editing ? (
        <LinkEditor
          key={editing.index ?? "new"}
          initial={editing.value}
          onCancel={() => setEditing(null)}
          onSave={(link) => {
            const next = [...links];
            if (editing.index === null) next.push(link);
            else next[editing.index] = link;
            return saveAll(next, `'${link.name}' 링크를 저장했어요.`);
          }}
        />
      ) : (
        <button
          onClick={() => setEditing({ index: null, value: emptyLink() })}
          className="w-fit px-5 py-2 rounded-full bg-stone-900 text-white text-sm"
        >
          + 새 링크 추가
        </button>
      )}
      <ul className="divide-y divide-stone-200 rounded-2xl border border-stone-200 bg-white">
        {links.length === 0 && <li className="p-5 text-stone-500">링크가 없어요. 음악 탭에도 표시되지 않아요.</li>}
        {links.map((link, i) => (
          <li key={i} className="flex items-center gap-4 p-4">
            <div className="flex flex-col">
              <button onClick={() => move(i, -1)} disabled={i === 0} aria-label={`${link.name} 앞으로`} className="px-2 text-stone-500 hover:text-stone-900 disabled:opacity-25">
                ▲
              </button>
              <button
                onClick={() => move(i, 1)}
                disabled={i === links.length - 1}
                aria-label={`${link.name} 뒤로`}
                className="px-2 text-stone-500 hover:text-stone-900 disabled:opacity-25"
              >
                ▼
              </button>
            </div>
            <div className="grid place-items-center h-12 w-24 shrink-0 rounded-lg bg-stone-50">
              {link.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={link.logo} alt={link.name} className="h-7 w-auto" />
              ) : (
                <span className="text-xs text-stone-400">로고 없음</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-stone-900">{link.name}</p>
              <p className="text-sm text-stone-500 truncate">{link.url}</p>
            </div>
            <button onClick={() => setEditing({ index: i, value: link })} className="text-sm text-stone-700 hover:underline">
              수정
            </button>
            <ConfirmButton
              label="삭제"
              onConfirm={() =>
                saveAll(
                  links.filter((_, k) => k !== i),
                  `'${link.name}' 링크를 삭제했어요.`,
                ).catch((e) => setNotice(errorMessage(e)))
              }
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

// 삭제처럼 되돌릴 수 없는 동작은 한 번 더 눌러야 실행되게 함 (브라우저 확인창 대신)
function ConfirmButton({ label, onConfirm }: { label: string; onConfirm: () => Promise<void> }) {
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!armed) {
    return (
      <button onClick={() => setArmed(true)} className="text-sm text-stone-500 hover:text-red-700">
        {label}
      </button>
    );
  }
  return (
    <span className="flex gap-2 text-sm">
      <button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await onConfirm();
          setBusy(false);
          setArmed(false);
        }}
        className="text-red-700 font-medium"
      >
        정말 {label}
      </button>
      <button onClick={() => setArmed(false)} className="text-stone-500">
        취소
      </button>
    </span>
  );
}

function Dashboard({ fb }: { fb: FirebaseServices }) {
  const [section, setSection] = useState<Section>("releases");
  const [releases, setReleases] = useState<Release[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [guestbook, setGuestbook] = useState<GuestbookEntry[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [editing, setEditing] = useState<
    | { kind: "release"; value: Release }
    | { kind: "team"; value: Team }
    | { kind: "notice"; value: Notice }
    | null
  >(null);
  const [notice, setNotice] = useState("");
  const [loadError, setLoadError] = useState(false);

  const reload = useCallback(async () => {
    const [music, entries, noticeList] = await Promise.all([
      loadMusic({ showStaticWhenEmpty: false }),
      loadGuestbook(),
      loadNotices({ showStaticWhenEmpty: false }),
    ]);
    setLoadError(!music.remote);
    if (music.remote) {
      setReleases(music.releases);
      setTeams(music.teams);
    }
    setGuestbook(entries ?? []);
    if (noticeList.remote) setNotices(noticeList.notices);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const done = async (message: string) => {
    setEditing(null);
    setNotice(message);
    await reload();
  };

  const saveRelease = async (r: Release) => {
    const { id, ...data } = r;
    if (!data.cover) delete data.cover;
    if (!data.audio?.trim()) delete data.audio;
    const oldAudio = id ? releases.find((x) => x.id === id)?.audio : undefined;
    if (id) await setDoc(doc(fb.db, "releases", id), data);
    else await addDoc(collection(fb.db, "releases"), data);
    // 음원 파일을 바꾸거나 뺐으면 예전 파일은 지움 (데이터베이스에 올린 파일만)
    if (oldAudio && oldAudio !== data.audio) await deleteAudio(fb, oldAudio).catch(() => {});
    await done(`'${r.title}'을(를) 저장했어요.`);
  };

  const saveTeam = async (t: Team) => {
    const { id, ...data } = t;
    // 데이터베이스는 빈 값(undefined)을 저장하지 못하므로, 사진을 뺐으면 칸 자체를 지움
    if (!data.image) delete data.image;
    if (id) {
      await setDoc(doc(fb.db, "teams", id), data);
      const oldName = teams.find((x) => x.id === id)?.name;
      if (oldName && oldName !== t.name) {
        await Promise.all(
          releases
            .filter((r) => r.team === oldName && r.id)
            .map((r) => setDoc(doc(fb.db, "releases", r.id!), { team: t.name }, { merge: true })),
        );
      }
    } else {
      await addDoc(collection(fb.db, "teams"), { ...data, order: teams.length });
    }
    await done(`'${t.name}' 팀을 저장했어요.`);
  };

  // 팀 순서 바꾸기: 위/아래 팀과 자리를 바꾸고 모든 팀의 순서 번호를 0부터 다시 매김
  const moveTeam = async (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= teams.length) return;
    const next = [...teams];
    [next[index], next[target]] = [next[target], next[index]];
    setTeams(next.map((t, i) => ({ ...t, order: i })));
    try {
      const batch = writeBatch(fb.db);
      next.forEach((t, i) => batch.set(doc(fb.db, "teams", t.id!), { order: i }, { merge: true }));
      await batch.commit();
    } catch (e) {
      setNotice(errorMessage(e));
      await reload();
    }
  };

  const saveNotice = async (n: Notice) => {
    const data = { title: n.title, body: n.body, pinned: n.pinned };
    // 작성일은 처음 저장할 때만 기록하고, 수정할 때는 그대로 둠
    if (n.id) await setDoc(doc(fb.db, "notices", n.id), data, { merge: true });
    else await addDoc(collection(fb.db, "notices"), { ...data, createdAt: serverTimestamp() });
    await done(`'${n.title}' 공지를 저장했어요.`);
  };

  // 사이트 코드에 적혀 있던 실제 음원(예시 제외)과 공지를 데이터베이스로 옮김
  const importStatic = async () => {
    try {
      if (releases.length === 0) {
        for (const r of RELEASES.filter((x) => !x.example)) {
          const { id: _id, example: _example, ...data } = r;
          await addDoc(collection(fb.db, "releases"), data);
        }
      }
      if (notices.length === 0) {
        for (const n of STATIC_NOTICES) {
          await addDoc(collection(fb.db, "notices"), {
            title: n.title,
            body: n.body,
            pinned: n.pinned,
            createdAt: n.createdAt ?? serverTimestamp(),
          });
        }
      }
      await done("기존 음원과 공지를 가져왔어요. 이제 관리자 페이지에서 수정할 수 있어요.");
    } catch (e) {
      setNotice(errorMessage(e));
    }
  };

  // 방명록 하트: 관리자만 남기고 취소할 수 있음 (firestore.rules 에서 liked 칸만 바꿀 수 있게 막음)
  const toggleHeart = async (g: GuestbookEntry) => {
    const liked = !g.liked;
    setGuestbook((list) => list.map((x) => (x.id === g.id ? { ...x, liked } : x)));
    try {
      await setDoc(doc(fb.db, "guestbook", g.id), { liked }, { merge: true });
    } catch (e) {
      setGuestbook((list) => list.map((x) => (x.id === g.id ? { ...x, liked: g.liked } : x)));
      setNotice(errorMessage(e));
    }
  };

  const remove = async (path: string, id: string, label: string) => {
    try {
      await deleteDoc(doc(fb.db, path, id));
      await done(`${label}을(를) 삭제했어요.`);
    } catch (e) {
      setNotice(errorMessage(e));
    }
  };

  if (loadError) {
    return (
      <p className="rounded-xl border border-amber-300 bg-amber-50 p-5 text-amber-900">
        데이터베이스에 연결하지 못했어요. Firebase 콘솔에서 Firestore 데이터베이스가 만들어져 있는지 확인해 주세요.
      </p>
    );
  }

  return (
    <div>
      <div role="tablist" className="flex gap-1 p-1 w-fit rounded-full border border-stone-200 bg-white text-sm">
        {(Object.keys(SECTION_LABELS) as Section[]).map((s) => (
          <button
            key={s}
            role="tab"
            aria-selected={section === s}
            onClick={() => {
              setSection(s);
              setEditing(null);
              setNotice("");
            }}
            className={`px-4 py-1.5 rounded-full ${section === s ? "bg-stone-900 text-white" : "text-stone-500 hover:text-stone-900"}`}
          >
            {SECTION_LABELS[s]}
          </button>
        ))}
      </div>

      {(releases.length === 0 || notices.length === 0) && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-stone-200 bg-white p-5">
          <p className="text-sm">
            지금 사이트에 보이는 음원(Day 3, 내 남은 초록을 모두 그대에게)과 공지를 데이터베이스로 옮겨요. 처음 한 번만 하면 돼요.
          </p>
          <ConfirmButton label="기존 내용 가져오기" onConfirm={importStatic} />
        </div>
      )}

      {notice && <p className="mt-6 rounded-lg bg-stone-100 px-4 py-3 text-sm text-stone-700">{notice}</p>}

      {section === "releases" && (
        <div className="mt-8 grid gap-6">
          {editing?.kind === "release" ? (
            <ReleaseEditor
              fb={fb}
              key={editing.value.id ?? "new"}
              initial={editing.value}
              teams={teams}
              onSave={saveRelease}
              onCancel={() => setEditing(null)}
            />
          ) : (
            <button
              onClick={() => setEditing({ kind: "release", value: emptyRelease() })}
              className="w-fit px-5 py-2 rounded-full bg-stone-900 text-white text-sm"
            >
              + 새 음원 추가
            </button>
          )}
          <ul className="divide-y divide-stone-200 rounded-2xl border border-stone-200 bg-white">
            {releases.length === 0 && <li className="p-5 text-stone-500">아직 등록된 음원이 없어요.</li>}
            {releases.map((r) => (
              <li key={r.id} className="flex items-center gap-4 p-4">
                <div className="w-12 h-12 shrink-0 overflow-hidden rounded-md bg-stone-100">
                  {r.cover && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.cover} alt="" className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-stone-900 truncate">{r.title}</p>
                  <p className="text-sm text-stone-500 tabular-nums">
                    {r.team ? `팀 · ${r.team}` : "솔로"} · {r.type} · {r.date}
                  </p>
                </div>
                <button onClick={() => setEditing({ kind: "release", value: r })} className="text-sm text-stone-700 hover:underline">
                  수정
                </button>
                <ConfirmButton
                  label="삭제"
                  onConfirm={async () => {
                    await remove("releases", r.id!, `'${r.title}'`);
                    await deleteAudio(fb, r.audio).catch(() => {});
                  }}
                />
              </li>
            ))}
          </ul>
        </div>
      )}

      {section === "teams" && (
        <div className="mt-8 grid gap-6">
          {editing?.kind === "team" ? (
            <TeamEditor key={editing.value.id ?? "new"} initial={editing.value} onSave={saveTeam} onCancel={() => setEditing(null)} />
          ) : (
            <button
              onClick={() => setEditing({ kind: "team", value: emptyTeam() })}
              className="w-fit px-5 py-2 rounded-full bg-stone-900 text-white text-sm"
            >
              + 새 팀 추가
            </button>
          )}
          <ul className="divide-y divide-stone-200 rounded-2xl border border-stone-200 bg-white">
            {teams.length === 0 && <li className="p-5 text-stone-500">아직 등록된 팀이 없어요.</li>}
            {teams.map((t, i) => (
              <li key={t.id} className="flex items-center gap-4 p-4">
                <div className="flex flex-col">
                  <button
                    onClick={() => moveTeam(i, -1)}
                    disabled={i === 0}
                    aria-label={`${t.name} 위로`}
                    className="px-2 text-stone-500 hover:text-stone-900 disabled:opacity-25"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => moveTeam(i, 1)}
                    disabled={i === teams.length - 1}
                    aria-label={`${t.name} 아래로`}
                    className="px-2 text-stone-500 hover:text-stone-900 disabled:opacity-25"
                  >
                    ▼
                  </button>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-stone-900">{t.name}</p>
                  <p className="text-sm text-stone-500 tabular-nums">
                    {[t.period, t.role, `음원 ${releases.filter((r) => r.team === t.name).length}개`].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <button onClick={() => setEditing({ kind: "team", value: t })} className="text-sm text-stone-700 hover:underline">
                  수정
                </button>
                <ConfirmButton label="삭제" onConfirm={() => remove("teams", t.id!, `'${t.name}' 팀`)} />
              </li>
            ))}
          </ul>
          <p className="text-sm text-stone-500">
            ▲ ▼로 순서를 바꾸면 음악 탭에도 같은 순서로 보여요. 팀을 삭제해도 그 팀으로 등록된 음원은 지워지지 않아요.
          </p>
        </div>
      )}

      {section === "notices" && (
        <div className="mt-8 grid gap-6">
          {editing?.kind === "notice" ? (
            <NoticeEditor
              key={editing.value.id ?? "new"}
              initial={editing.value}
              onSave={saveNotice}
              onCancel={() => setEditing(null)}
            />
          ) : (
            <button
              onClick={() => setEditing({ kind: "notice", value: emptyNotice() })}
              className="w-fit px-5 py-2 rounded-full bg-stone-900 text-white text-sm"
            >
              + 새 공지 작성
            </button>
          )}
          <ul className="divide-y divide-stone-200 rounded-2xl border border-stone-200 bg-white">
            {notices.length === 0 && <li className="p-5 text-stone-500">아직 공지가 없어요.</li>}
            {notices.map((n) => (
              <li key={n.id} className="flex items-center gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-stone-900 truncate">
                    {n.pinned && <span className="mr-2 text-xs px-2 py-0.5 rounded-full bg-stone-900 text-white">고정</span>}
                    {n.title}
                  </p>
                  <p className="text-sm text-stone-500 tabular-nums">{formatDate(n.createdAt)}</p>
                </div>
                <button onClick={() => setEditing({ kind: "notice", value: n })} className="text-sm text-stone-700 hover:underline">
                  수정
                </button>
                <ConfirmButton label="삭제" onConfirm={() => remove("notices", n.id!, `'${n.title}' 공지`)} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {section === "headings" && <HeadingsEditor fb={fb} />}

      {section === "bio" && <BioEditor fb={fb} />}

      {section === "clinic" && <ClinicInfoEditor fb={fb} />}

      {section === "demos" && <DemosManager fb={fb} />}

      {section === "links" && <LinksManager fb={fb} />}

      {section === "album" && <AlbumStockEditor fb={fb} />}

      {section === "guestbook" && (
        <ul className="mt-8 divide-y divide-stone-200 rounded-2xl border border-stone-200 bg-white">
          {guestbook.length === 0 && <li className="p-5 text-stone-500">아직 방명록 글이 없어요.</li>}
          {guestbook.map((g) => (
            <li key={g.id} className="flex gap-4 p-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <span className="font-medium text-stone-900">{g.name}</span>
                  <span className="ml-2 text-stone-400 tabular-nums">{formatDate(g.createdAt)}</span>
                </p>
                <p className="mt-1 whitespace-pre-wrap break-words">{g.message}</p>
              </div>
              <button
                type="button"
                onClick={() => toggleHeart(g)}
                aria-pressed={!!g.liked}
                aria-label={g.liked ? "하트 취소" : "하트 남기기"}
                title={g.liked ? "하트 취소" : "하트 남기기"}
                className={`self-start grid place-items-center w-10 h-10 -my-1 rounded-full hover:bg-rose-50 ${g.liked ? "text-rose-600" : "text-stone-300 hover:text-rose-600"}`}
              >
                <HeartIcon filled={!!g.liked} size={26} />
              </button>
              <ConfirmButton label="삭제" onConfirm={() => remove("guestbook", g.id, "방명록 글")} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function AdminApp() {
  // undefined: 확인 중 / null: Firebase에 연결할 수 없음
  const [fb, setFb] = useState<FirebaseServices | null | undefined>(undefined);
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [loginError, setLoginError] = useState("");

  useEffect(() => {
    let unsubscribe = () => {};
    getFirebase().then((services) => {
      setFb(services);
      if (services) unsubscribe = onAuthStateChanged(getAuth(services.app), setUser);
    });
    return () => unsubscribe();
  }, []);

  const login = async () => {
    if (!fb) return;
    setLoginError("");
    try {
      await signInWithPopup(getAuth(fb.app), new GoogleAuthProvider());
    } catch {
      setLoginError("로그인하지 못했어요. 팝업 차단을 해제하고 다시 시도해 주세요.");
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-700">
      <header className="border-b border-stone-200 bg-white">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <span className="font-bold text-stone-900">관리자</span>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/" className="text-stone-500 hover:text-stone-900">
              사이트 보기
            </Link>
            {fb && user && (
              <button onClick={() => signOut(getAuth(fb.app))} className="text-stone-500 hover:text-stone-900">
                로그아웃
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10">
        {fb === undefined || (fb && user === undefined) ? (
          <p className="text-stone-400">불러오는 중…</p>
        ) : fb === null ? (
          <p className="rounded-xl border border-amber-300 bg-amber-50 p-5 text-amber-900">
            Firebase 설정을 찾지 못했어요. 배포된 사이트(heebonyang.web.app/admin)에서 열어 주세요.
          </p>
        ) : !user ? (
          <div className="max-w-sm mx-auto mt-16 text-center">
            <h1 className="text-2xl font-bold text-stone-900">관리자 로그인</h1>
            <p className="mt-3 text-stone-500">관리자 구글 계정으로 로그인해 주세요.</p>
            <button onClick={login} className="mt-8 px-6 py-3 rounded-full bg-stone-900 text-white">
              Google 계정으로 로그인
            </button>
            {loginError && <p className="mt-4 text-sm text-red-700">{loginError}</p>}
          </div>
        ) : (
          <>
            <p className="mb-6 text-sm text-stone-500">{user.email} 계정으로 로그인했어요.</p>
            <Dashboard fb={fb} />
          </>
        )}
      </main>
    </div>
  );
}

// 미발매곡(데모): 제목·메모·음원 파일. 음악 탭 '미발매곡'에 이 순서대로 보임
function DemoEditor({
  fb,
  initial,
  onSave,
  onCancel,
}: {
  fb: FirebaseServices;
  initial: Demo;
  onSave: (d: Demo) => Promise<void>;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<Demo>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.audio) {
      setError("음원 파일을 올려 주세요.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave({ ...draft, title: draft.title.trim(), note: draft.note?.trim() });
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-4 rounded-2xl border border-stone-200 bg-white p-6">
      <Field label="제목">
        <input id="demo-title" required value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className={inputClass} />
      </Field>
      <Field label="메모" hint="선택 · 예: 2026년 가을 작업 중">
        <textarea id="demo-note" rows={2} value={draft.note ?? ""} onChange={(e) => setDraft({ ...draft, note: e.target.value })} className={inputClass} />
      </Field>
      <div className="grid gap-1.5 min-w-0">
        <span className="text-sm text-stone-600">음원 파일</span>
        <AudioUpload fb={fb} value={draft.audio} onChange={(audio) => setDraft({ ...draft, audio })} />
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-full border border-stone-300 text-sm">
          취소
        </button>
        <button type="submit" disabled={saving} className="px-5 py-2 rounded-full bg-stone-900 text-white text-sm disabled:opacity-50">
          {saving ? "저장 중…" : "저장"}
        </button>
      </div>
    </form>
  );
}

function DemosManager({ fb }: { fb: FirebaseServices }) {
  const [demos, setDemos] = useState<Demo[] | null>(null);
  const [editing, setEditing] = useState<Demo | null>(null);
  const [message, setMessage] = useState("");

  const reload = useCallback(async () => setDemos(await loadDemos()), []);
  useEffect(() => {
    reload();
  }, [reload]);

  if (!demos) return <p className="mt-8 text-stone-400">불러오는 중…</p>;

  const save = async (d: Demo) => {
    const { id, ...data } = d;
    if (!data.note) delete data.note;
    const old = id ? demos.find((x) => x.id === id)?.audio : undefined;
    if (id) await setDoc(doc(fb.db, "demos", id), data);
    else await addDoc(collection(fb.db, "demos"), { ...data, order: demos.length });
    if (old && old !== data.audio) await deleteAudio(fb, old).catch(() => {});
    setEditing(null);
    setMessage(`'${d.title}'을(를) 저장했어요.`);
    await reload();
  };

  const move = async (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= demos.length) return;
    const next = [...demos];
    [next[index], next[target]] = [next[target], next[index]];
    setDemos(next.map((d, i) => ({ ...d, order: i })));
    try {
      const batch = writeBatch(fb.db);
      next.forEach((d, i) => batch.set(doc(fb.db, "demos", d.id!), { order: i }, { merge: true }));
      await batch.commit();
    } catch (e) {
      setMessage(errorMessage(e));
      await reload();
    }
  };

  const remove = async (d: Demo) => {
    try {
      await deleteDoc(doc(fb.db, "demos", d.id!));
      await deleteAudio(fb, d.audio).catch(() => {});
      setMessage(`'${d.title}'을(를) 삭제했어요.`);
      await reload();
    } catch (e) {
      setMessage(errorMessage(e));
    }
  };

  return (
    <div className="mt-8 grid gap-6">
      {message && <p className="text-sm text-stone-600">{message}</p>}
      {editing ? (
        <DemoEditor key={editing.id ?? "new"} fb={fb} initial={editing} onSave={save} onCancel={() => setEditing(null)} />
      ) : (
        <button onClick={() => setEditing({ title: "", audio: "" })} className="w-fit px-5 py-2 rounded-full bg-stone-900 text-white text-sm">
          + 새 데모 추가
        </button>
      )}
      <ul className="divide-y divide-stone-200 rounded-2xl border border-stone-200 bg-white">
        {demos.length === 0 && <li className="p-5 text-stone-500">아직 올린 데모가 없어요. 데모가 없으면 음악 탭에도 보이지 않아요.</li>}
        {demos.map((d, i) => (
          <li key={d.id} className="flex items-center gap-4 p-4">
            <div className="flex flex-col">
              <button onClick={() => move(i, -1)} disabled={i === 0} aria-label={`${d.title} 위로`} className="px-2 text-stone-500 hover:text-stone-900 disabled:opacity-25">
                ▲
              </button>
              <button
                onClick={() => move(i, 1)}
                disabled={i === demos.length - 1}
                aria-label={`${d.title} 아래로`}
                className="px-2 text-stone-500 hover:text-stone-900 disabled:opacity-25"
              >
                ▼
              </button>
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-stone-900">{d.title}</p>
              {d.note && <p className="text-sm text-stone-500 truncate">{d.note}</p>}
            </div>
            <button onClick={() => setEditing(d)} className="text-sm text-stone-700 hover:underline">
              수정
            </button>
            <ConfirmButton label="삭제" onConfirm={() => remove(d)} />
          </li>
        ))}
      </ul>
      <p className="text-sm text-stone-500">MP3, 한 곡 15MB 이하. ▲ ▼로 순서를 바꾸면 음악 탭에도 같은 순서로 보여요.</p>
    </div>
  );
}

// 치과 탭 약력: 한 줄에 하나씩. 저장하면 치과 탭 이름 바로 아래에 보임
function BioEditor({ fb }: { fb: FirebaseServices }) {
  const [bio, setBio] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    loadSettings({ fresh: true }).then((s) => setBio(s.dentalBio));
  }, []);

  if (bio === null) return <p className="mt-8 text-stone-400">불러오는 중…</p>;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("saving");
    const cleaned = bio
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .join("\n");
    try {
      await setDoc(doc(fb.db, ...SETTINGS_DOC), { dentalBio: cleaned }, { merge: true });
      setBio(cleaned);
      setStatus("saved");
    } catch (err) {
      setError(errorMessage(err));
      setStatus("error");
    }
  };

  return (
    <form onSubmit={submit} className="mt-8 grid gap-5 rounded-2xl border border-stone-200 bg-white p-6">
      <p className="text-sm text-stone-500">
        치과 탭 이름 바로 아래에 보이는 약력이에요. 한 줄에 하나씩 쓰고, 앞에 연도를 쓰면 왼쪽에 따로 보여요. 비워 두면 표시되지 않아요.
      </p>
      <Field label="약력" hint="예: 2015 ○○대학교 치의학대학원 졸업 / 2020 – 현재 ○○치과 원장">
        <textarea
          id="dental-bio"
          rows={10}
          value={bio}
          onChange={(e) => {
            setBio(e.target.value);
            setStatus("idle");
          }}
          className={`${inputClass} leading-relaxed`}
        />
      </Field>
      <div className="flex items-center justify-end gap-4">
        {status === "saved" && <span className="text-sm text-stone-600">저장했어요. 사이트에 바로 반영돼요.</span>}
        {status === "error" && <span className="text-sm text-red-700">{error}</span>}
        <button type="submit" disabled={status === "saving"} className="px-5 py-2 rounded-full bg-stone-900 text-white text-sm disabled:opacity-50">
          {status === "saving" ? "저장 중…" : "저장"}
        </button>
      </div>
    </form>
  );
}

// 칸 이름·내용 목록 (치과 정보의 '진료 안내', '진료 예약·문의')
function InfoListEditor({
  title,
  hint,
  items,
  onChange,
}: {
  title: string;
  hint: string;
  items: InfoItem[];
  onChange: (items: InfoItem[]) => void;
}) {
  const update = (i: number, patch: Partial<InfoItem>) => onChange(items.map((it, k) => (k === i ? { ...it, ...patch } : it)));
  const move = (i: number, delta: -1 | 1) => {
    const j = i + delta;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <fieldset className="grid gap-3">
      <legend className="font-semibold text-stone-900">{title}</legend>
      <p className="-mt-1 text-sm text-stone-500">{hint}</p>
      {items.length === 0 && <p className="text-sm text-stone-400">항목이 없어요. 비워 두면 치과 탭에 이 부분이 보이지 않아요.</p>}
      {items.map((it, i) => (
        <div key={i} className="flex items-start gap-2">
          <div className="flex flex-col pt-1">
            <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`${it.label || "항목"} 위로`} className="px-1 text-xs text-stone-500 hover:text-stone-900 disabled:opacity-25">
              ▲
            </button>
            <button
              type="button"
              onClick={() => move(i, 1)}
              disabled={i === items.length - 1}
              aria-label={`${it.label || "항목"} 아래로`}
              className="px-1 text-xs text-stone-500 hover:text-stone-900 disabled:opacity-25"
            >
              ▼
            </button>
          </div>
          <input
            aria-label="칸 이름"
            placeholder="칸 이름 (예: 전화)"
            value={it.label}
            onChange={(e) => update(i, { label: e.target.value })}
            className={`${inputClass} w-32 shrink-0`}
          />
          <textarea
            aria-label="내용"
            placeholder="내용"
            rows={1}
            value={it.value}
            onChange={(e) => update(i, { value: e.target.value })}
            className={`${inputClass} min-w-0 flex-1 resize-y`}
          />
          <button
            type="button"
            onClick={() => onChange(items.filter((_, k) => k !== i))}
            aria-label={`${it.label || "항목"} 지우기`}
            className="px-2 py-2 text-stone-400 hover:text-red-700"
          >
            ✕
          </button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, { label: "", value: "" }])} className="w-fit text-sm text-stone-700 underline underline-offset-4">
        + 항목 추가
      </button>
    </fieldset>
  );
}

// 치과 탭 '진료 안내'와 '진료 예약·문의'에 보이는 정보
function ClinicInfoEditor({ fb }: { fb: FirebaseServices }) {
  const [clinic, setClinic] = useState<InfoItem[] | null>(null);
  const [contact, setContact] = useState<InfoItem[]>([]);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    loadSettings({ fresh: true }).then((s) => {
      setClinic(s.dentalClinic);
      setContact(s.dentalContact);
    });
  }, []);

  if (!clinic) return <p className="mt-8 text-stone-400">불러오는 중…</p>;

  const clean = (list: InfoItem[]) =>
    list.map((it) => ({ label: it.label.trim(), value: it.value.trim() })).filter((it) => it.label || it.value);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("saving");
    const dentalClinic = clean(clinic);
    const dentalContact = clean(contact);
    try {
      await setDoc(doc(fb.db, ...SETTINGS_DOC), { dentalClinic, dentalContact }, { merge: true });
      setClinic(dentalClinic);
      setContact(dentalContact);
      setStatus("saved");
    } catch (err) {
      setError(errorMessage(err));
      setStatus("error");
    }
  };

  const changed = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setStatus("idle");
  };

  return (
    <form onSubmit={submit} className="mt-8 grid gap-8 rounded-2xl border border-stone-200 bg-white p-6">
      <InfoListEditor
        title="진료 안내"
        hint="치과 탭에 카드로 보여요. 예: 전문 분야, 소속, 진료 시간"
        items={clinic}
        onChange={changed(setClinic)}
      />
      <InfoListEditor
        title="진료 예약·문의"
        hint="예: 전화, 주소, 예약 링크. 전화번호는 눌러서 바로 걸 수 있고, https:// 로 시작하는 주소는 링크가 돼요."
        items={contact}
        onChange={changed(setContact)}
      />
      <div className="flex items-center justify-end gap-4">
        {status === "saved" && <span className="text-sm text-stone-600">저장했어요. 사이트에 바로 반영돼요.</span>}
        {status === "error" && <span className="text-sm text-red-700">{error}</span>}
        <button type="submit" disabled={status === "saving"} className="px-5 py-2 rounded-full bg-stone-900 text-white text-sm disabled:opacity-50">
          {status === "saving" ? "저장 중…" : "저장"}
        </button>
      </div>
    </form>
  );
}
