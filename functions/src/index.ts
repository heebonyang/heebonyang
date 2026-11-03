// 수노 공장 서버 함수 (Firebase Cloud Functions)
//
// 웹 페이지(/suno)는 키를 갖고 있지 않고, 구글 로그인한 상태로 이 함수만 부른다.
// Claude와 sunoapi.org 키는 Firebase 비밀값(Secret Manager)에만 저장된다.
//
//   action "chat"     : Claude와 대화. 곡이 완성되면 song을 함께 돌려준다.
//   action "generate" : sunoapi.org로 곡 생성 시작 → taskId (비공식·유료)
//   action "status"   : 생성 상태 확인 → 완성되면 오디오 주소 목록

import Anthropic from "@anthropic-ai/sdk";
import { defineSecret } from "firebase-functions/params";
import { HttpsError, onCall } from "firebase-functions/v2/https";

const ANTHROPIC_API_KEY = defineSecret("ANTHROPIC_API_KEY");
const SUNOAPI_KEY = defineSecret("SUNOAPI_KEY");

// 사용할 수 있는 구글 계정. 비용이 드는 기능이라 관리자만 허용한다.
const ALLOWED_EMAILS = ["gmlqhs@gmail.com"];

const MODEL = "claude-opus-5-5";
const SUNO_BASE = "https://api.sunoapi.org";
const SUNO_MODEL = "V5";
const MAX_TITLE = 80;
const MAX_STYLE = 1000;
const MAX_LYRICS = 5000;

export type Song = {
  title: string;
  style: string;
  lyrics: string;
  exclude_styles: string;
  instrumental: boolean;
  notes: string;
};

const SYSTEM_PROMPT = `\
당신은 Suno AI로 음악을 만드는 작곡 파트너입니다. 사용자와 대화하며 곡의 방향을 함께 정하고,
Suno Custom 모드에 바로 넣을 수 있는 결과물을 만듭니다.

진행 방식
- 요청이 막연하면 장르, 분위기, 주제, 보컬, 언어 중 꼭 필요한 것만 짧게 물어봅니다.
  충분히 구체적이면 바로 초안을 만듭니다.
- 초안을 만들거나 고칠 때마다 save_song 도구로 화면에 보여 줍니다. 채팅에는 가사 전체를 다시
  쓰지 말고, 어떤 방향으로 만들었는지와 바꿔 볼 만한 점만 짧게 말합니다.
- 저장에 실패하면 이유를 보고 고쳐서 다시 저장합니다.

Suno 작성 규칙
- 스타일: 영어 키워드를 쉼표로 나열합니다. 장르, 분위기, 템포(BPM), 주요 악기, 보컬 특징,
  프로덕션 질감. 최대 ${MAX_STYLE}자.
- 실존 아티스트나 곡 이름은 스타일에 넣지 않고, 그 사운드를 장르·악기·보컬 특징으로 풀어 씁니다.
- 가사: [Intro], [Verse 1], [Pre-Chorus], [Chorus], [Bridge], [Outro] 같은 구조 태그를 줄 단위로
  넣습니다. 한 줄은 노래하기 좋게 짧게, 후렴은 기억에 남게 반복합니다. 최대 ${MAX_LYRICS}자.
- 기존 곡의 가사를 베끼지 않고 새로 씁니다. 제목은 ${MAX_TITLE}자 이하입니다.
`;

const TOOLS: Anthropic.Beta.BetaTool[] = [
  {
    name: "save_song",
    description:
      "곡 초안을 화면에 보여 준다. 초안을 처음 만들거나 고칠 때마다 호출한다. " +
      "길이 제한이나 형식에 문제가 있으면 오류와 이유를 돌려준다.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "곡 제목" },
        style: { type: "string", description: "Style of Music 칸에 넣을 영어 키워드" },
        lyrics: { type: "string", description: "구조 태그가 포함된 가사. 연주곡이면 빈 문자열" },
        exclude_styles: { type: "string", description: "빼고 싶은 스타일. 없으면 빈 문자열" },
        instrumental: { type: "boolean", description: "연주곡이면 true" },
        notes: { type: "string", description: "사용자에게 남길 짧은 메모" },
      },
      required: ["title", "style", "lyrics", "exclude_styles", "instrumental", "notes"],
      additionalProperties: false,
    },
    strict: true,
  },
];

function validate(s: Song): string[] {
  const p: string[] = [];
  if (!s.title.trim()) p.push("제목이 비어 있습니다.");
  if (s.title.length > MAX_TITLE) p.push(`제목이 ${s.title.length}자입니다. ${MAX_TITLE}자 이하로 줄이세요.`);
  if (!s.style.trim()) p.push("스타일이 비어 있습니다.");
  if (s.style.length > MAX_STYLE) p.push(`스타일이 ${s.style.length}자입니다. ${MAX_STYLE}자 이하로 줄이세요.`);
  if (s.lyrics.length > MAX_LYRICS) p.push(`가사가 ${s.lyrics.length}자입니다. ${MAX_LYRICS}자 이하로 줄이세요.`);
  if (!s.instrumental && !s.lyrics.trim()) p.push("보컬곡인데 가사가 없습니다.");
  if (s.lyrics.trim() && !/\[[^\]]+\]/.test(s.lyrics)) p.push("가사에 [Verse], [Chorus] 같은 구조 태그가 없습니다.");
  return p;
}

type Request =
  | { action: "chat"; messages: Anthropic.Beta.BetaMessageParam[] }
  | { action: "generate"; song: Song }
  | { action: "status"; taskId: string };

export const sunoFactory = onCall(
  {
    region: "asia-northeast3", // 서울
    secrets: [ANTHROPIC_API_KEY, SUNOAPI_KEY],
    timeoutSeconds: 300,
    memory: "512MiB",
    maxInstances: 2,
  },
  async (req) => {
    const token = req.auth?.token;
    if (!token?.email || !token.email_verified || !ALLOWED_EMAILS.includes(token.email)) {
      throw new HttpsError("permission-denied", "수노 공장을 쓸 수 있는 계정이 아니에요.");
    }
    const data = req.data as Request;
    switch (data?.action) {
      case "chat":
        return chat(data.messages);
      case "generate":
        return { taskId: await startGeneration(data.song) };
      case "status":
        return checkStatus(data.taskId);
      default:
        throw new HttpsError("invalid-argument", "알 수 없는 요청이에요.");
    }
  },
);

// --- Claude ---------------------------------------------------------------

async function chat(messages: Anthropic.Beta.BetaMessageParam[]) {
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > 200) {
    throw new HttpsError("invalid-argument", "대화 내용이 올바르지 않아요.");
  }
  const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() });
  let song: Song | null = null;

  // 도구 호출이 끝날 때까지 돈다 (검사 실패 → Claude가 고쳐서 다시 호출)
  for (let i = 0; i < 6; i++) {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      system: SYSTEM_PROMPT,
      tools: TOOLS,
      messages,
      output_config: { effort: "high" },
      // 안전 분류기가 거절하면 서버가 다른 모델로 다시 시도한다
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    });
    messages.push({ role: "assistant", content: response.content });

    if (response.stop_reason === "refusal") {
      return { messages, song, notice: "이 요청은 처리하지 않았어요. 다르게 요청해 보세요." };
    }
    if (response.stop_reason !== "tool_use") {
      return { messages, song };
    }

    const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];
    for (const block of response.content) {
      if (block.type !== "tool_use") continue;
      if (block.name !== "save_song") {
        results.push({ type: "tool_result", tool_use_id: block.id, content: "알 수 없는 도구", is_error: true });
        continue;
      }
      const candidate = block.input as Song;
      const problems = validate(candidate);
      if (problems.length) {
        results.push({ type: "tool_result", tool_use_id: block.id, content: "고칠 점:\n- " + problems.join("\n- "), is_error: true });
      } else {
        song = candidate;
        results.push({ type: "tool_result", tool_use_id: block.id, content: "화면에 표시했습니다." });
      }
    }
    messages.push({ role: "user", content: results });
  }
  return { messages, song };
}

// --- sunoapi.org (비공식) ---------------------------------------------------
// 요청 형식은 sunoapi.org 문서를 기준으로 했지만 바뀔 수 있다. 오류가 나면 아래를 최신 문서와 맞춰 보자.

async function suno(path: string, init?: { method: string; body: unknown }) {
  const res = await fetch(SUNO_BASE + path, {
    method: init?.method ?? "GET",
    headers: { Authorization: `Bearer ${SUNOAPI_KEY.value()}`, "Content-Type": "application/json" },
    body: init ? JSON.stringify(init.body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new HttpsError("unavailable", `sunoapi.org HTTP ${res.status}: ${text.slice(0, 200)}`);
  const body = JSON.parse(text);
  if (body.code !== undefined && body.code !== 200) {
    throw new HttpsError("unavailable", `sunoapi.org 오류 ${body.code}: ${body.msg ?? ""}`);
  }
  return body;
}

async function startGeneration(song: Song): Promise<string> {
  if (!song || validate(song).length) throw new HttpsError("invalid-argument", "곡 정보가 올바르지 않아요.");
  const payload: Record<string, unknown> = {
    customMode: true,
    instrumental: song.instrumental,
    model: SUNO_MODEL,
    title: song.title,
    style: song.style,
    // sunoapi.org는 콜백 주소를 요구하지만, 여기서는 status로 상태를 확인하므로 쓰지 않는다
    callBackUrl: "https://example.com/suno-callback",
  };
  if (!song.instrumental) payload.prompt = song.lyrics;
  if (song.exclude_styles) payload.negativeTags = song.exclude_styles;

  const body = await suno("/api/v1/generate", { method: "POST", body: payload });
  const taskId = body?.data?.taskId;
  if (!taskId) throw new HttpsError("unavailable", "sunoapi.org가 작업 ID를 돌려주지 않았어요.");
  return taskId;
}

async function checkStatus(taskId: string) {
  if (typeof taskId !== "string" || !taskId) throw new HttpsError("invalid-argument", "작업 ID가 없어요.");
  const body = await suno(`/api/v1/generate/record-info?${new URLSearchParams({ taskId })}`);
  const data = body?.data ?? {};
  const status = String(data.status ?? "");
  const tracks: Record<string, string>[] = data.response?.sunoData ?? data.sunoData ?? [];
  const audio = tracks
    .map((t) => t.audioUrl || t.audio_url || t.sourceAudioUrl)
    .filter((u): u is string => typeof u === "string" && u.startsWith("https://"));
  return {
    status,
    done: status === "SUCCESS",
    failed: /FAIL|ERROR/.test(status),
    error: data.errorMessage ?? "",
    audio,
  };
}
