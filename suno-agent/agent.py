"""Suno 작곡 에이전트.

사용자와 대화하며 곡의 방향을 잡고, Suno Custom 모드에 넣을
제목 / 스타일 / 가사를 만든 뒤 save_song 도구로 저장한다.

실행:  python agent.py
종료:  빈 줄에서 엔터 또는 Ctrl+C
"""

from __future__ import annotations

import json
from pathlib import Path

import anthropic

from backends import MAX_LYRICS, MAX_STYLE, MAX_TITLE, ManualBackend, Song, SunoBackend

MODEL = "claude-opus-5-5"
HERE = Path(__file__).resolve().parent

# 나중에 Suno 공식 API가 생기면 이 줄만 다른 백엔드로 바꾼다.
BACKEND: SunoBackend = ManualBackend(HERE / "output")

SYSTEM_PROMPT = f"""\
당신은 Suno AI로 음악을 만드는 작곡 파트너입니다. 사용자와 대화하며 곡의 방향을 함께 정하고,
Suno Custom 모드에 바로 붙여넣을 수 있는 결과물을 만듭니다.

진행 방식
- 요청이 막연하면 장르, 분위기, 주제, 보컬(남/여, 랩 등), 언어 중 꼭 필요한 것만 짧게 물어봅니다.
  충분히 구체적이면 바로 초안을 만듭니다.
- 초안은 채팅에 보여 주고 사용자의 의견을 받아 고칩니다. 사용자가 마음에 든다고 하거나
  저장을 요청하면 save_song 도구로 저장합니다. 저장에 실패하면 이유를 보고 고쳐서 다시 저장합니다.

Suno 작성 규칙
- 스타일(Style of Music): 영어 키워드를 쉼표로 나열합니다. 장르, 하위 장르, 분위기, 템포(BPM),
  주요 악기, 보컬 특징, 프로덕션 질감 순서가 좋습니다. 최대 {MAX_STYLE}자.
- 실존 아티스트나 곡 이름은 스타일에 넣지 않습니다. Suno가 거부하므로 그 사람의 사운드를
  장르, 악기, 보컬 특징으로 풀어서 씁니다.
- 가사: [Intro], [Verse 1], [Pre-Chorus], [Chorus], [Bridge], [Outro] 같은 구조 태그를
  줄 단위로 넣습니다. [Instrumental Break], [Guitar Solo], [Fade Out] 같은 태그도 쓸 수 있습니다.
  한 줄은 노래하기 좋은 길이로 짧게, 후렴은 기억에 남게 반복합니다. 최대 {MAX_LYRICS}자.
- 기존 곡의 가사를 베끼지 않고 새로 씁니다.
- 제목은 {MAX_TITLE}자 이하입니다.
"""

TOOLS = [
    {
        "name": "save_song",
        "description": (
            "완성된 곡을 Suno Custom 모드용으로 저장한다. 사용자가 초안을 승인했을 때만 호출한다. "
            "길이 제한이나 형식에 문제가 있으면 오류와 이유를 돌려준다."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "title": {"type": "string", "description": "곡 제목"},
                "style": {"type": "string", "description": "Style of Music 칸에 넣을 영어 키워드"},
                "lyrics": {
                    "type": "string",
                    "description": "구조 태그가 포함된 가사. 연주곡이면 빈 문자열",
                },
                "exclude_styles": {
                    "type": "string",
                    "description": "빼고 싶은 스타일 (예: 'autotune, heavy distortion'). 없으면 빈 문자열",
                },
                "instrumental": {"type": "boolean", "description": "연주곡이면 true"},
                "notes": {
                    "type": "string",
                    "description": "사용자에게 남길 메모 (추천 Suno 설정, 다음에 바꿔볼 점 등)",
                },
            },
            "required": ["title", "style", "lyrics", "exclude_styles", "instrumental", "notes"],
            "additionalProperties": False,
        },
        "strict": True,
    }
]


def run_tool(name: str, args: dict) -> tuple[str, bool]:
    """도구를 실행하고 (결과 문자열, 오류 여부)를 돌려준다."""
    if name != "save_song":
        return f"알 수 없는 도구: {name}", True
    song = Song(**args)
    problems = song.validate()
    if problems:
        return "저장하지 못했습니다. 고칠 점:\n- " + "\n- ".join(problems), True
    return BACKEND.submit(song), False


def agent_turn(client: anthropic.Anthropic, messages: list) -> None:
    """사용자 메시지 하나에 대해, 도구 호출이 끝날 때까지 에이전트 루프를 돈다."""
    while True:
        response = client.beta.messages.create(
            model=MODEL,
            max_tokens=16000,
            system=SYSTEM_PROMPT,
            tools=TOOLS,
            messages=messages,
            output_config={"effort": "high"},
            # 안전 분류기가 요청을 거절하면 서버가 다른 모델로 다시 시도한다.
            betas=["server-side-fallback-2026-07-01"],
            fallbacks="default",
        )
        # 응답 전체(content)를 그대로 기록해야 다음 요청에서 맥락이 이어진다.
        messages.append({"role": "assistant", "content": response.content})

        for block in response.content:
            if block.type == "text" and block.text.strip():
                print(f"\n🎵 {block.text}\n")

        if response.stop_reason == "refusal":
            print("(모델이 이 요청을 처리하지 않았습니다. 다르게 요청해 보세요.)")
            return
        if response.stop_reason == "max_tokens":
            print("(응답이 길어서 중간에 끊겼습니다. '이어서'라고 입력해 보세요.)")
            return
        if response.stop_reason != "tool_use":
            return

        results = []
        for block in response.content:
            if block.type != "tool_use":
                continue
            output, is_error = run_tool(block.name, block.input)
            print(f"[{block.name}] {output}")
            results.append(
                {
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": output,
                    "is_error": is_error,
                }
            )
        messages.append({"role": "user", "content": results})


def main() -> None:
    client = anthropic.Anthropic()  # ANTHROPIC_API_KEY 환경 변수를 사용
    messages: list = []
    print("Suno 작곡 에이전트입니다. 어떤 곡을 만들고 싶은지 말해 주세요. (빈 줄 엔터로 종료)")
    try:
        while True:
            user_input = input("\n나> ").strip()
            if not user_input:
                break
            messages.append({"role": "user", "content": user_input})
            agent_turn(client, messages)
    except (KeyboardInterrupt, EOFError):
        pass
    print("\n안녕히 가세요!")


if __name__ == "__main__":
    main()
