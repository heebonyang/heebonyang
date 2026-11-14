"use client";
import { useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore/lite";
import type { FirebaseServices } from "../firebase";

// 0집 판매 페이지(heebonmd.web.app)의 문구를 고치는 곳.
// 저장하면 Firestore settings/albumPage 에 들어가고, 0집 페이지가 열릴 때 이 값을 읽어 씀 (배포 필요 없음).
// 한 번도 저장하지 않았으면 0집 페이지의 content.json(처음 값)을 불러와서 보여줌.
const MD_SITE = "https://heebonmd.web.app";
const DOC = ["settings", "albumPage"] as const;

type Content = Record<string, Record<string, string | number> | string | number>;
type FieldType = "text" | "area" | "number" | "date" | "url" | "email" | "color" | "cover";
type FieldDef = { path: string; label: string; type?: FieldType; hint?: string };

const GROUPS: { title: string; note?: string; fields: FieldDef[] }[] = [
  {
    title: "광안대교 문구",
    note: "맨 위 광안대교 그림 아래 바다 위에 보이는 문구",
    fields: [
      { path: "harbor.kicker", label: "작은 문구", hint: "좌표 등" },
      { path: "harbor.title", label: "큰 문구", type: "area" },
      { path: "harbor.sub", label: "아래 문장", type: "area" },
    ],
  },
  {
    title: "0집 (맨 위)",
    note: "자켓 · 제목 · 소개 · 가격 · 구매 버튼",
    fields: [
      { path: "album.coverImage", label: "자켓 이미지", type: "cover" },
      { path: "hero.kicker", label: "작은 문구" },
      { path: "hero.title", label: "이름" },
      { path: "hero.titleAccent", label: "강조 문구", hint: "파란색으로 보임" },
      { path: "hero.lead", label: "소개 문장", type: "area" },
      { path: "album.description", label: "설명", type: "area" },
      { path: "album.tracklist", label: "수록곡", type: "area", hint: "한 줄에 한 곡" },
      { path: "album.hiddenTrack", label: "히든 트랙 문구", hint: "비우면 숨김" },
      { path: "album.price", label: "가격 표시", hint: "예: 10,000원 · 택배비 포함" },
      { path: "album.buyButton", label: "구매 버튼 글자" },
    ],
  },
  {
    title: "주문서",
    fields: [
      { path: "order.unitPrice", label: "1장 가격", type: "number", hint: "원 · 입금 금액 계산에 쓰여요" },
      { path: "order.priceNote", label: "입금 금액 옆 안내", hint: "예: 택배비 포함" },
      { path: "order.maxQty", label: "한 번에 주문할 수 있는 최대 수량", type: "number" },
      { path: "order.bank", label: "입금 계좌", hint: "은행 계좌번호 예금주" },
    ],
  },
  {
    title: "100일 라이브",
    fields: [
      { path: "live.headline", label: "제목", type: "area" },
      { path: "live.description", label: "설명", type: "area" },
      { path: "live.startDate", label: "시작일", type: "date" },
      { path: "live.days", label: "기간", type: "number", hint: "일" },
      { path: "live.time", label: "방송 시간" },
      { path: "live.place", label: "장소" },
    ],
  },
  {
    title: "공연",
    fields: [
      { path: "concert.date", label: "공연 날짜", type: "date", hint: "라이브 항로의 '상륙' 날짜로 쓰여요" },
      { path: "concert.headline", label: "제목", type: "area" },
      { path: "concert.description", label: "설명", type: "area" },
      { path: "concert.venue", label: "장소" },
      { path: "concert.time", label: "시간" },
      { path: "concert.ticket", label: "티켓" },
      { path: "concert.ticketButton", label: "버튼 글자" },
      { path: "concert.ticketUrl", label: "예매 링크", type: "url", hint: "비우면 버튼이 흐리게 보여요" },
      { path: "concert.seatRows", label: "좌석 배치도 · 줄 수", type: "number", hint: "A, B, C… 최대 20줄" },
      { path: "concert.seatsPerRow", label: "좌석 배치도 · 한 줄 좌석 수", type: "number", hint: "가운데 통로로 반씩 나뉘어요" },
      { path: "concert.bookedSeats", label: "예매된 좌석", type: "area", hint: "예: A6, A7, B10 — 적은 좌석이 분홍으로 보여요" },
      { path: "concert.seatNote", label: "배치도 아래 안내", hint: "비우면 숨김" },
    ],
  },
  {
    title: "이메일 · 색",
    note: "이메일은 맨 아래에 작게 보여요 (비우면 숨김). 맨 위 유튜브·인스타그램은 메인 홈페이지와 같은 주소예요",
    fields: [
      { path: "links.email", label: "이메일", type: "email" },
      { path: "accent", label: "포인트 색", type: "color" },
    ],
  },
];

function getPath(o: Content, path: string): string | number | undefined {
  return path.split(".").reduce<unknown>((a, k) => (a && typeof a === "object" ? (a as Record<string, unknown>)[k] : undefined), o) as
    | string
    | number
    | undefined;
}

function setPath(o: Content, path: string, value: string | number): Content {
  const copy: Content = JSON.parse(JSON.stringify(o));
  const keys = path.split(".");
  if (keys.length === 1) {
    copy[keys[0]] = value;
  } else {
    const group = (copy[keys[0]] && typeof copy[keys[0]] === "object" ? copy[keys[0]] : {}) as Record<string, string | number>;
    group[keys[1]] = value;
    copy[keys[0]] = group;
  }
  return copy;
}

// 자켓은 Firestore 문서 하나(1MB 제한)에 함께 저장하므로 가로세로 최대 800px JPEG로 줄임
function resizeCover(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 800 / Math.max(img.width, img.height));
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

const coverSrc = (v: string) => (/^(data:|https?:)/.test(v) ? v : `${MD_SITE}/${v.replace(/^\//, "")}`);

const inputClass = "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 focus:outline-none focus:border-stone-900";

export default function AlbumPageEditor({ fb }: { fb: FirebaseServices }) {
  const [draft, setDraft] = useState<Content | null>(null);
  const [loadError, setLoadError] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        // 처음 값(content.json) 위에 저장된 값을 덮어씀 → 나중에 0집 페이지에 새 칸이 생겨도 빈칸이 되지 않음
        const base: Content = await fetch(`${MD_SITE}/content.json?t=${Date.now()}`)
          .then((r) => (r.ok ? r.json() : {}))
          .catch(() => ({}));
        const snap = await getDoc(doc(fb.db, ...DOC));
        const saved = (snap.data() ?? {}) as Content;
        const merged: Content = { ...base };
        for (const [k, v] of Object.entries(saved)) {
          merged[k] = v && typeof v === "object" && typeof base[k] === "object" ? { ...(base[k] as object), ...v } : v;
        }
        if (Object.keys(merged).length === 0) throw new Error("empty");
        setDraft(merged);
      } catch {
        setLoadError("0집 페이지 문구를 불러오지 못했어요. 새로고침해 주세요.");
      }
    })();
  }, [fb]);

  if (loadError) return <p className="mt-8 text-red-700">{loadError}</p>;
  if (!draft) return <p className="mt-8 text-stone-400">불러오는 중…</p>;

  const change = (path: string, value: string | number) => {
    setDraft(setPath(draft, path, value));
    setStatus("idle");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("saving");
    try {
      await setDoc(doc(fb.db, ...DOC), draft);
      setStatus("saved");
    } catch (err) {
      const code = (err as { code?: string })?.code;
      setError(
        code === "permission-denied"
          ? "이 계정에는 저장 권한이 없어요. 관리자 구글 계정으로 로그인했는지 확인해 주세요."
          : "저장하지 못했어요. 잠시 후 다시 시도해 주세요.",
      );
      setStatus("error");
    }
  };

  const renderField = (f: FieldDef) => {
    const id = `album-page-${f.path.replace(".", "-")}`;
    const raw = getPath(draft, f.path);
    const value = raw == null ? "" : String(raw);
    const label = (
      <label htmlFor={id} className="text-sm text-stone-600">
        {f.label}
        {f.hint && <span className="ml-2 text-stone-400">{f.hint}</span>}
      </label>
    );
    if (f.type === "cover") {
      return (
        <div key={f.path} className="grid gap-1.5">
          {label}
          <div className="flex flex-wrap items-center gap-4">
            {value && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coverSrc(value)} alt="자켓 미리보기" className="w-24 h-24 rounded object-cover border border-stone-200" />
            )}
            <input
              id={id}
              type="file"
              accept="image/*"
              className="text-sm"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  change(f.path, await resizeCover(file));
                } catch {
                  setError("이미지를 읽지 못했어요.");
                  setStatus("error");
                }
              }}
            />
          </div>
        </div>
      );
    }
    const common = {
      id,
      value,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        change(f.path, f.type === "number" ? Number(e.target.value) : e.target.value),
    };
    return (
      <div key={f.path} className="grid gap-1.5 min-w-0">
        {label}
        {f.type === "area" ? (
          <textarea {...common} rows={3} className={`${inputClass} resize-y`} />
        ) : f.type === "color" ? (
          <input {...common} type="color" className="h-10 w-20 rounded border border-stone-300 bg-white p-1" />
        ) : (
          <input {...common} type={f.type ?? "text"} className={`${inputClass} ${f.type === "number" ? "tabular-nums" : ""}`} />
        )}
      </div>
    );
  };

  return (
    <form onSubmit={submit} className="mt-8 grid gap-6">
      <p className="text-sm text-stone-500">
        0집 판매 페이지(
        <a href={MD_SITE} target="_blank" rel="noreferrer" className="underline underline-offset-4">
          heebonmd.web.app
        </a>
        )의 문구예요. 저장하면 페이지를 새로고침했을 때 바로 반영돼요. 남은 수량은 &lsquo;0집 CD&rsquo;, 주문은 &lsquo;0집 주문&rsquo;에서 관리해요.
      </p>
      {GROUPS.map((g) => (
        <fieldset key={g.title} className="grid gap-5 rounded-2xl border border-stone-200 bg-white p-6 min-w-0">
          <legend className="px-2 font-semibold text-stone-900">{g.title}</legend>
          {g.note && <p className="-mt-2 text-sm text-stone-500">{g.note}</p>}
          {g.fields.map(renderField)}
        </fieldset>
      ))}
      <div className="sticky bottom-0 flex flex-wrap items-center justify-end gap-4 border-t border-stone-200 bg-stone-50/95 py-4">
        {status === "saved" && <span className="text-sm text-stone-600">저장했어요. 0집 페이지를 새로고침하면 보여요.</span>}
        {status === "error" && <span className="text-sm text-red-700">{error}</span>}
        <a href={MD_SITE} target="_blank" rel="noreferrer" className="text-sm text-stone-600 underline underline-offset-4">
          0집 페이지 보기
        </a>
        <button type="submit" disabled={status === "saving"} className="px-5 py-2 rounded-full bg-stone-900 text-white text-sm disabled:opacity-50">
          {status === "saving" ? "저장 중…" : "저장"}
        </button>
      </div>
    </form>
  );
}
