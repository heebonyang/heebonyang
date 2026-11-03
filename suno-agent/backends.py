"""Suno로 곡을 보내는 '백엔드'.

지금 Suno에는 공식 공개 API가 없다. 그래서 기본값은 ManualBackend:
곡 정보를 파일로 저장하고, 사용자가 Suno 웹사이트의 Custom 모드에 붙여넣는다.

나중에 공식 API가 생기면 SunoBackend를 상속한 클래스를 하나 만들고
agent.py의 BACKEND만 바꾸면 된다. 에이전트 쪽 코드는 그대로 둔다.
"""

from __future__ import annotations

import json
import re
from abc import ABC, abstractmethod
from dataclasses import asdict, dataclass, field
from datetime import datetime
from pathlib import Path

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
