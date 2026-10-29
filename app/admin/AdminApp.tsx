"use client";
import { useCallback, useEffect, useState } from "react";
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, type User } from "firebase/auth";
import { addDoc, collection, deleteDoc, doc, serverTimestamp, setDoc, writeBatch } from "firebase/firestore/lite";
import { getFirebase, type FirebaseServices } from "../firebase";
import { loadMusic } from "../musicData";
import { formatDate, loadGuestbook, type GuestbookEntry } from "../Guestbook";
import { Cover } from "../MusicPanel";
import { RELEASES, type Release, type Team } from "../music";
import { loadNotices, STATIC_NOTICES, type Notice } from "../notices";
import { loadSettings, SETTINGS_DOC, type SiteSettings } from "../siteSettings";

type Section = "headings" | "releases" | "teams" | "notices" | "guestbook";

const SECTION_LABELS: Record<Section, string> = { headings: "머리글", releases: "음원", teams: "팀 프로젝트", notices: "공지", guestbook: "방명록" };

const RELEASE_TYPES: Release["type"][] = ["싱글", "EP", "정규"];

const LINK_FIELDS: { key: keyof Release["links"]; label: string }[] = [
  { key: "melon", label: "Melon" },
  { key: "spotify", label: "Spotify" },
  { key: "apple", label: "Apple Music" },
  { key: "youtube", label: "YouTube" },
];

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
  initial,
  teams,
  onSave,
  onCancel,
}: {
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
    const links = Object.fromEntries(Object.entries(draft.links).filter(([, v]) => v && v.trim())) as Release["links"];
    try {
      await onSave({
        ...draft,
        title: draft.title.trim(),
        tracks: tracksText.split("\n").map((t) => t.trim()).filter(Boolean),
        links,
      });
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-6 md:grid-cols-[200px_1fr] rounded-2xl border border-stone-200 bg-white p-6">
      <div className="grid gap-3 content-start">
        <div className="overflow-hidden rounded-xl border border-stone-200">
          <Cover release={{ ...draft, title: draft.title || "제목" }} index={0} />
        </div>
        <label className="text-center text-sm px-3 py-2 rounded-lg border border-stone-300 cursor-pointer hover:border-stone-900">
          커버 이미지 선택
          <input
            id="release-cover"
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => pickCover(e.target.files?.[0])}
          />
        </label>
        {draft.cover && (
          <button type="button" onClick={() => set("cover", undefined)} className="text-sm text-stone-500 hover:text-red-700">
            커버 지우기
          </button>
        )}
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
        <Field label="미리듣기 음원 주소" hint="선택 · 예: /audio/파일이름.mp3">
          <input
            id="release-audio"
            value={draft.audio ?? ""}
            onChange={(e) => set("audio", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="수록곡" hint="한 줄에 한 곡씩">
          <textarea
            id="release-tracks"
            rows={4}
            value={tracksText}
            onChange={(e) => setTracksText(e.target.value)}
            className={inputClass}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          {LINK_FIELDS.map((f) => (
            <Field key={f.key} label={`${f.label} 링크`} hint="선택">
              <input
                id={`release-link-${f.key}`}
                type="url"
                value={draft.links[f.key] ?? ""}
                onChange={(e) => set("links", { ...draft.links, [f.key]: e.target.value })}
                placeholder="https://"
                className={inputClass}
              />
            </Field>
          ))}
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
        { musicTagline: draft.musicTagline.trim(), dentalTagline: draft.dentalTagline.trim() },
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
      <Field label="음악 탭" hint="싱어송라이터 양희본 옆">
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
      <Field label="치과 탭" hint="치과의사 양희본 옆">
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
    if (id) await setDoc(doc(fb.db, "releases", id), data);
    else await addDoc(collection(fb.db, "releases"), data);
    await done(`'${r.title}'을(를) 저장했어요.`);
  };

  const saveTeam = async (t: Team) => {
    const { id, ...data } = t;
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
            {releases.map((r, i) => (
              <li key={r.id} className="flex items-center gap-4 p-4">
                <div className="w-14 shrink-0 overflow-hidden rounded-md">
                  <Cover release={r} index={i} />
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
                <ConfirmButton label="삭제" onConfirm={() => remove("releases", r.id!, `'${r.title}'`)} />
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
            <a href="/" className="text-stone-500 hover:text-stone-900">
              사이트 보기
            </a>
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
