# Suno 작곡 에이전트

Claude와 대화하면서 곡의 방향을 정하면, Suno **Custom 모드**에 바로 붙여넣을 수 있는
**제목, 스타일, 가사**를 만들어 `output/` 폴더에 저장해 줍니다.

> Suno에는 아직 공식 공개 API가 없습니다(2026년 11월 기준, 파트너 프로그램만 있음).
> 그래서 이 에이전트는 곡을 Suno에 직접 보내지 않고, 붙여넣을 내용을 만들어 줍니다.
> 비공식 API는 Suno 약관 위반이나 서비스 중단 위험이 있어서 쓰지 않았습니다.

## 실행

```bash
cd suno-agent
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export ANTHROPIC_API_KEY=sk-ant-...   # https://console.anthropic.com 에서 발급
python agent.py
```

## 사용 예

```
나> 비 오는 새벽에 듣는 잔잔한 시티팝, 여자 보컬, 한국어 가사
🎵 (초안: 제목 / 스타일 / 가사)
나> 후렴을 좀 더 밝게 해줘
🎵 (수정본)
나> 좋아, 저장해줘
[save_song] 저장 완료: output/20261103-101500_새벽비.md
```

저장된 `.md` 파일을 열고 suno.com → Create → **Custom**에서 각 칸에 붙여넣으면 됩니다.

## 구조

| 파일 | 역할 |
|---|---|
| `agent.py` | 에이전트 루프, 시스템 프롬프트, `save_song` 도구 정의 |
| `backends.py` | 곡 데이터(`Song`), Suno 길이 제한 검사, 저장 방식(`ManualBackend`) |

동작 순서는 이렇습니다.

1. 사용자 메시지를 Claude에 보냅니다.
2. Claude가 초안을 보여 주거나, 승인을 받으면 `save_song` 도구를 호출합니다.
3. `Song.validate()`가 길이 제한과 구조 태그를 검사합니다. 문제가 있으면 이유를 Claude에게
   돌려보내고, Claude가 고쳐서 다시 저장합니다.
4. 통과하면 백엔드가 곡을 처리합니다. 지금은 파일로 저장합니다.

## Suno 공식 API가 나오면

`backends.py`에 `SunoBackend`를 상속한 클래스를 추가하고, `submit()`에서 API를 호출하면 됩니다.
그다음 `agent.py`의 `BACKEND = ...` 한 줄만 바꾸면 에이전트는 그대로 동작합니다.

## 참고

- 모델은 `claude-opus-5-5`를 씁니다. 비용을 줄이려면 `agent.py`의 `MODEL`을
  `claude-sonnet-5-5`로 바꾸세요.
- 안전 분류기가 요청을 거절하면 서버가 다른 모델로 다시 시도하는 `fallbacks` 옵션이 켜져 있습니다.
- Suno 입력 칸 길이 제한(제목 80자, 스타일 1000자, 가사 5000자)은 `backends.py` 맨 위에 있습니다.
