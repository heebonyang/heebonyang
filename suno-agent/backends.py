"""Suno로 곡을 보내는 '백엔드'.

지금 Suno에는 공식 공개 API가 없다.
- ManualBackend (기본): 곡 정보를 파일로 저장하고, 사용자가 Suno 웹사이트에 붙여넣는다.
- SunoApiOrgBackend: 비공식 서비스 sunoapi.org로 곡을 실제로 생성한다 (유료, 위험 있음).

나중에 공식 API가 생기면 SunoBackend를 상속한 클래스를 하나 만들고
agent.py의 BACKEND만 바꾸면 된다. 에이전트 쪽 코드는 그대로 둔다.
"""

from __future__ import annotations

import json
import re
import time
from abc import ABC, abstractmethod
from dataclasses import asdict, dataclass, field
from datetime import datetime
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

# Suno Custom 모드 입력 칸 길이 제한 (v4.5 이후 기준). Suno가 바꾸면 여기만 고친다.
MAX_TITLE = 80
MAX_STYLE = 1000
MAX_LYRICS = 5000


@dataclass
class Song:
    title: str
    style: str
    lyrics: str = ""
    exclude_styles: str = ""
    instrumental: bool = False
    notes: str = ""
    created_at: str = field(default_factory=lambda: datetime.now().isoformat(timespec="seconds"))

    def validate(self) -> list[str]:
        """Suno에 넣을 수 없는 부분을 찾아 문제 목록을 돌려준다 (없으면 빈 목록)."""
        problems = []
        if not self.title.strip():
            problems.append("제목이 비어 있습니다.")
        if len(self.title) > MAX_TITLE:
            problems.append(f"제목이 {len(self.title)}자입니다. {MAX_TITLE}자 이하로 줄이세요.")
        if not self.style.strip():
            problems.append("스타일이 비어 있습니다.")
        if len(self.style) > MAX_STYLE:
            problems.append(f"스타일이 {len(self.style)}자입니다. {MAX_STYLE}자 이하로 줄이세요.")
        if len(self.lyrics) > MAX_LYRICS:
            problems.append(f"가사가 {len(self.lyrics)}자입니다. {MAX_LYRICS}자 이하로 줄이세요.")
        if not self.instrumental and not self.lyrics.strip():
            problems.append("보컬곡인데 가사가 없습니다. 가사를 쓰거나 instrumental을 true로 하세요.")
        if self.lyrics.strip() and not re.search(r"\[[^\]]+\]", self.lyrics):
            problems.append("가사에 [Verse], [Chorus] 같은 구조 태그가 없습니다.")
        return problems


class SunoBackend(ABC):
    @abstractmethod
    def submit(self, song: Song) -> str:
        """곡을 처리하고, 결과를 설명하는 문장을 돌려준다 (에이전트에게 전달됨)."""


class ManualBackend(SunoBackend):
    """곡을 output/ 폴더에 저장한다. 사용자가 Suno에 직접 붙여넣는다."""

    def __init__(self, out_dir: Path):
        self.out_dir = out_dir

    def submit(self, song: Song) -> str:
        self.out_dir.mkdir(parents=True, exist_ok=True)
        stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        slug = re.sub(r"[^\w가-힣-]+", "_", song.title).strip("_")[:40] or "song"
        base = self.out_dir / f"{stamp}_{slug}"

        base.with_suffix(".json").write_text(
            json.dumps(asdict(song), ensure_ascii=False, indent=2), encoding="utf-8"
        )
        base.with_suffix(".md").write_text(_to_markdown(song), encoding="utf-8")
        return (
            f"저장 완료: {base.with_suffix('.md')}\n"
            "사용자가 suno.com → Create → Custom 모드에서 각 칸에 붙여넣으면 됩니다."
        )


class SunoApiOrgBackend(ManualBackend):
    """비공식 서비스 sunoapi.org로 곡을 실제로 생성하고 mp3를 내려받는다.

    ⚠️ Suno가 공인한 API가 아니다. 약관 위반이나 서비스 중단 위험이 있고, 유료(크레딧 차감)다.
    API 형식은 sunoapi.org 문서를 기준으로 했지만 바뀔 수 있다. 오류가 나면 아래 상수와
    _find_audio_urls()를 최신 문서(https://docs.sunoapi.org)와 맞춰 보자.

    곡 정보는 먼저 파일로 저장하므로, API가 실패해도 붙여넣기용 결과물은 남는다.
    """

    BASE_URL = "https://api.sunoapi.org"
    GENERATE_PATH = "/api/v1/generate"
    STATUS_PATH = "/api/v1/generate/record-info"
    DONE_STATUSES = {"SUCCESS"}
    POLL_SECONDS = 15
    TIMEOUT_SECONDS = 600

    def __init__(
        self,
        out_dir: Path,
        api_key: str,
        model: str = "V5",
        callback_url: str = "https://example.com/suno-callback",
        base_url: str | None = None,
        confirm=None,
    ):
        super().__init__(out_dir)
        self.api_key = api_key
        self.model = model
        # sunoapi.org는 콜백 주소를 요구한다. 여기서는 상태 조회(polling)로 결과를 받으므로
        # 콜백은 쓰지 않는다. 받을 서버가 있으면 SUNO_CALLBACK_URL로 바꾸면 된다.
        self.callback_url = callback_url
        self.base_url = (base_url or self.BASE_URL).rstrip("/")
        # 크레딧이 나가기 전에 사용자에게 묻는 함수. None이면 묻지 않는다.
        self.confirm = confirm

    def submit(self, song: Song) -> str:
        saved = super().submit(song)
        if self.confirm and not self.confirm(song):
            return saved + "\n사용자가 Suno 자동 생성을 취소했습니다. 파일만 저장했습니다."

        try:
            task_id = self._start(song)
            print(f"  Suno 생성 시작 (작업 ID {task_id}). 보통 2~5분 걸립니다.")
            urls = self._wait(task_id)
            files = self._download(song, urls)
        except Exception as e:  # 네트워크, 인증, 크레딧 부족, 응답 형식 변경 등
            return saved + f"\nSuno 자동 생성 실패: {e}"
        return saved + "\nSuno 생성 완료. 내려받은 파일:\n" + "\n".join(f"- {f}" for f in files)

    # --- sunoapi.org 호출 -------------------------------------------------

    def _start(self, song: Song) -> str:
        payload = {
            "customMode": True,
            "instrumental": song.instrumental,
            "model": self.model,
            "title": song.title,
            "style": song.style,
            "callBackUrl": self.callback_url,
        }
        if not song.instrumental:
            payload["prompt"] = song.lyrics  # Custom 모드에서 prompt는 가사로 쓰인다
        if song.exclude_styles:
            payload["negativeTags"] = song.exclude_styles

        body = self._request("POST", self.GENERATE_PATH, payload)
        task_id = (body.get("data") or {}).get("taskId")
        if not task_id:
            raise RuntimeError(f"작업 ID가 없는 응답: {body}")
        return task_id

    def _wait(self, task_id: str) -> list[str]:
        deadline = time.monotonic() + self.TIMEOUT_SECONDS
        while time.monotonic() < deadline:
            body = self._request("GET", f"{self.STATUS_PATH}?{urlencode({'taskId': task_id})}")
            data = body.get("data") or {}
            status = str(data.get("status", ""))
            if status in self.DONE_STATUSES:
                urls = _find_audio_urls(data)
                if not urls:
                    raise RuntimeError(f"완료됐지만 오디오 주소를 찾지 못함: {data}")
                return urls
            if "FAIL" in status or "ERROR" in status:
                raise RuntimeError(f"생성 실패 ({status}): {data.get('errorMessage') or ''}")
            print(f"  상태: {status or '대기 중'}…")
            time.sleep(self.POLL_SECONDS)
        raise TimeoutError(f"{self.TIMEOUT_SECONDS}초 안에 끝나지 않았습니다 (작업 ID {task_id}).")

    def _download(self, song: Song, urls: list[str]) -> list[Path]:
        stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        slug = re.sub(r"[^\w가-힣-]+", "_", song.title).strip("_")[:40] or "song"
        files = []
        for i, url in enumerate(urls, start=1):  # Suno는 보통 한 번에 2곡을 만든다
            path = self.out_dir / f"{stamp}_{slug}_{i}.mp3"
            with urlopen(Request(url, headers={"User-Agent": "suno-agent"}), timeout=120) as r:
                path.write_bytes(r.read())
            files.append(path)
        return files

    def _request(self, method: str, path: str, payload: dict | None = None) -> dict:
        req = Request(
            self.base_url + path,
            method=method,
            data=json.dumps(payload).encode() if payload is not None else None,
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
        )
        try:
            with urlopen(req, timeout=60) as r:
                body = json.loads(r.read().decode("utf-8"))
        except HTTPError as e:
            raise RuntimeError(f"HTTP {e.code}: {e.read().decode('utf-8', 'replace')[:300]}") from e
        # sunoapi.org는 HTTP 200 안에 code 필드로 오류를 알려 준다.
        if body.get("code") not in (None, 200):
            raise RuntimeError(f"API 오류 {body.get('code')}: {body.get('msg')}")
        return body


def _find_audio_urls(data: dict) -> list[str]:
    """상태 응답에서 곡 목록을 찾아 오디오 주소를 꺼낸다. 필드 이름 변화에 너그럽게."""
    tracks = (data.get("response") or {}).get("sunoData") or data.get("sunoData") or []
    urls = []
    for t in tracks:
        url = t.get("audioUrl") or t.get("audio_url") or t.get("sourceAudioUrl")
        if url:
            urls.append(url)
    return urls


def _to_markdown(song: Song) -> str:
    parts = [
        f"# {song.title}",
        "",
        "Suno → Create → **Custom** 모드에서 아래 내용을 각 칸에 붙여넣으세요.",
        "",
        "## Song Title",
        "```",
        song.title,
        "```",
        "",
        "## Style of Music",
        "```",
        song.style,
        "```",
    ]
    if song.exclude_styles:
        parts += ["", "## Exclude Styles (More Options)", "```", song.exclude_styles, "```"]
    if song.instrumental:
        parts += ["", "## Instrumental", "켜기 (가사 없음)"]
    else:
        parts += ["", "## Lyrics", "```", song.lyrics, "```"]
    if song.notes:
        parts += ["", "## 메모", song.notes]
    return "\n".join(parts) + "\n"
