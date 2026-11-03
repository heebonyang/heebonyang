# Suno 작곡 에이전트

Claude와 대화하면서 곡의 방향을 정하면, Suno **Custom 모드**에 바로 붙여넣을 수 있는
**제목, 스타일, 가사**를 만들어 `output/` 폴더에 저장해 줍니다.

> Suno에는 아직 공식 공개 API가 없습니다(2026년 11월 기준, 파트너 프로그램만 있음).
> 기본 모드는 붙여넣을 내용만 만들어 줍니다. `SUNOAPI_KEY`를 설정하면 비공식 서비스
> [sunoapi.org](https://sunoapi.org)로 곡을 **자동 생성**하고 mp3까지 내려받습니다.

## 두 가지 모드

| 모드 | 켜는 방법 | 하는 일 |
|---|---|---|
| 파일 저장 (기본) | 아무것도 안 함 | `output/`에 `.md`, `.json` 저장. Suno에 직접 붙여넣기 |
| 자동 생성 | `SUNOAPI_KEY` 설정 | 위 파일 저장 + Suno로 생성 + mp3 2곡 다운로드 |

### ⚠️ 자동 생성 모드 주의

- sunoapi.org는 **Suno가 공인하지 않은** 제3자 서비스입니다. Suno 약관 위반 소지가 있고,
  언제든 막히거나 형식이 바뀔 수 있습니다. 상업적으로 쓸 곡이라면 저작권, 상업 이용 조건을
  sunoapi.org와 Suno 양쪽에서 꼭 확인하세요.
- **유료**입니다. 생성할 때마다 sunoapi.org 크레딧이 차감되므로, 생성 직전에 `[y/N]`으로 한 번 더 묻습니다.
- API 형식은 sunoapi.org 문서를 기준으로 했지만 실제 서비스로는 아직 테스트하지 못했습니다.
  오류가 나면 `backends.py`의 `SunoApiOrgBackend` 상단 상수와 `_find_audio_urls()`를
  [최신 문서](https://docs.sunoapi.org)와 맞춰 보세요.
- API가 실패해도 붙여넣기용 파일은 먼저 저장되므로, 그걸로 Suno에서 직접 만들 수 있습니다.

```bash
export SUNOAPI_KEY=...            # sunoapi.org에서 발급
export SUNO_MODEL=V5              # 선택: V4_5 등 (기본 V5)
export SUNO_CALLBACK_URL=...      # 선택: 결과를 받을 서버가 있을 때만
```

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
| `backends.py` | 곡 데이터(`Song`), Suno 길이 제한 검사, 저장 방식(`ManualBackend`, `SunoApiOrgBackend`) |

동작 순서는 이렇습니다.

1. 사용자 메시지를 Claude에 보냅니다.
2. Claude가 초안을 보여 주거나, 승인을 받으면 `save_song` 도구를 호출합니다.
3. `Song.validate()`가 길이 제한과 구조 태그를 검사합니다. 문제가 있으면 이유를 Claude에게
   돌려보내고, Claude가 고쳐서 다시 저장합니다.
4. 통과하면 백엔드가 곡을 처리합니다. 파일로 저장하고, 자동 생성 모드면 sunoapi.org에
   생성을 요청한 뒤 15초마다 상태를 확인하고(최대 10분), 끝나면 mp3를 내려받습니다.

## Suno 공식 API가 나오면

`backends.py`에 `SunoBackend`를 상속한 클래스를 추가하고, `submit()`에서 API를 호출하면 됩니다.
그다음 `agent.py`의 `make_backend()`에서 그 클래스를 쓰게 바꾸면 에이전트는 그대로 동작합니다.

## 참고

- 모델은 `claude-opus-5-5`를 씁니다. 비용을 줄이려면 `agent.py`의 `MODEL`을
  `claude-sonnet-5-5`로 바꾸세요.
- 안전 분류기가 요청을 거절하면 서버가 다른 모델로 다시 시도하는 `fallbacks` 옵션이 켜져 있습니다.
- Suno 입력 칸 길이 제한(제목 80자, 스타일 1000자, 가사 5000자)은 `backends.py` 맨 위에 있습니다.
