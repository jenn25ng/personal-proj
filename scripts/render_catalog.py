#!/usr/bin/env python3
"""data/series.json 을 사람이 읽는 CATALOG.md 로 렌더링한다.

usage: python3 scripts/render_catalog.py
"""
import json
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def main() -> None:
    data = json.loads((ROOT / "data" / "series.json").read_text(encoding="utf-8"))
    series = data["series"]
    episodes = json.loads(
        (ROOT / "data" / "episodes.json").read_text(encoding="utf-8")
    )["episodes"]

    by_genre = defaultdict(list)
    for s in series:
        by_genre[s["genre"]].append(s)

    lines = [
        "# 막장 드라마 카탈로그",
        "",
        f"총 **{len(series)}편** / **{len(by_genre)}개 장르** / "
        f"**{sum(len(v) for v in episodes.values())}회차**. "
        "원본 데이터는 `data/series.json`과 `data/episodes.json`, "
        "생성 슬롯은 `data/slots.json`.",
        "",
        "| 컬럼 | 의미 |",
        "| --- | --- |",
        "| `genre` | 카드 좌상단 태그 |",
        "| `title` / `logline` | 카드 제목 / 설명 |",
        "| `totalEpisodes` / `freeEpisodes` | 총 N화 / 무료 N화 |",
        "| `makjangLevel` | 막장 강도 1~5 |",
        "| `slots` | 낙차 x 배신 x 비밀 x 시한 조합 |",
        "| `freeCutLine` | 무료 마지막 화의 마지막 문장 (결제 전환 포인트) |",
        "",
        "---",
        "",
    ]

    for genre in sorted(by_genre, key=lambda g: (-len(by_genre[g]), g)):
        lines.append(f"## {genre}")
        lines.append("")
        for s in by_genre[genre]:
            lines.append(f"### {s['id']}. {s['title']}")
            lines.append("")
            lines.append(s["logline"])
            lines.append("")
            lines.append(
                f"`총 {s['totalEpisodes']}화 · 무료 {s['freeEpisodes']}화` · "
                f"막장 강도 {'●' * s['makjangLevel']}{'○' * (5 - s['makjangLevel'])}"
            )
            lines.append("")
            slots = s["slots"]
            lines.append(
                f"- 조합: {slots['낙차']} / {slots['배신']} / {slots['비밀']} / {slots['시한']}"
            )
            lines.append(f"- 무료 컷: {s['freeCutLine']}")
            lines.append("")
            lines.append("<details><summary>회차별 시놉시스</summary>")
            lines.append("")
            for e in episodes.get(s["id"], []):
                mark = " 🔒" if not e["isFree"] else ""
                cut = " **← 무료 마지막 화**" if e["isFreeCut"] else ""
                lines.append(
                    f"{e['ep']}. *({e['act']})* {e['synopsis']}{mark}{cut}"
                )
            lines.append("")
            lines.append("</details>")
            lines.append("")
        lines.append("---")
        lines.append("")

    (ROOT / "CATALOG.md").write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")
    print(f"CATALOG.md 생성 완료: {len(series)}편 / {len(by_genre)}장르")


if __name__ == "__main__":
    main()
