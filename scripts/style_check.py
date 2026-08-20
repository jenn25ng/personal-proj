#!/usr/bin/env python3
"""웹소설 관행 기준으로 초고의 문체 지표를 측정한다.

기준 (리서치 근거는 STYLE.md 참고):
  분량        공백 포함 5,000자 ±10%
  문장 길이   평균 25자 이하 (단문 중심)
  장문 비율   45자 초과 문장이 전체의 12% 이하
  대사 비율   전체 글자의 25% 이상
  지문 연속   대사 없이 이어지는 지문 400자 이하 (관행 '지문 5줄'의 완화 환산)
  문단 길이   평균 2줄 이하 (모바일 한 화면 기준)

usage: python3 scripts/style_check.py drafts/*.md
"""
from __future__ import annotations

import re
import sys
from dataclasses import dataclass
from pathlib import Path

TARGET_CHARS = 5000
CHAR_TOLERANCE = 0.10
MAX_AVG_SENTENCE = 25
MAX_LONG_RATIO = 0.12
LONG_SENTENCE = 45
MIN_DIALOGUE_RATIO = 0.25
# 관행은 '지문 5줄'이지만, 한 문장을 한 줄로 조판하는 방식에서는 줄 수로 셀 수 없다.
# 이 규칙이 막으려는 것은 텍스트 덩어리이고 그건 '문단 평균 줄수'가 직접 재므로,
# 여기서는 도입부와 마무리의 무대사 구간을 허용하는 선(400자)까지만 본다.
MAX_NARRATION_RUN = 400
MAX_AVG_PARA_LINES = 2.0

DIALOGUE = re.compile(r'[""“”].*?[""“”]|\*[^*\n]+\*', re.S)
SENT_END = re.compile(r'(?<=[.!?…])\s+|\n+')


@dataclass
class Metrics:
    name: str
    chars: int          # 공백 포함, 개행 제외
    chars_nospace: int
    sentences: int
    avg_sentence: float
    long_ratio: float
    dialogue_ratio: float
    max_narration_run: int
    avg_para_lines: float
    paragraphs: int


def body_of(text: str) -> str:
    """front matter 와 제목 줄, 구분선을 걷어낸 본문."""
    if text.startswith("---"):
        text = text.split("---", 2)[2]
    lines = [l for l in text.splitlines()
             if not l.startswith("#") and l.strip() != "---"]
    return "\n".join(lines).strip()


def measure(path: Path) -> Metrics:
    body = body_of(path.read_text(encoding="utf-8"))

    chars = len(body.replace("\n", ""))
    chars_nospace = len(re.sub(r"\s", "", body))

    sents = [s.strip() for s in SENT_END.split(body) if s.strip()]
    lengths = [len(s) for s in sents]
    avg = sum(lengths) / len(lengths) if lengths else 0
    long_ratio = sum(1 for n in lengths if n > LONG_SENTENCE) / len(lengths) if lengths else 0

    dialogue_chars = sum(len(m.group()) for m in DIALOGUE.finditer(body))
    dialogue_ratio = dialogue_chars / chars if chars else 0

    # 대사 없이 이어지는 지문 줄 수의 최댓값
    run = best = 0
    for line in body.splitlines():
        if not line.strip():
            continue
        if DIALOGUE.search(line):
            run = 0
        else:
            run += len(line.strip())
            best = max(best, run)

    paras = [p for p in re.split(r"\n\s*\n", body) if p.strip()]
    avg_para = sum(len(p.strip().splitlines()) for p in paras) / len(paras) if paras else 0

    return Metrics(path.stem, chars, chars_nospace, len(sents), avg, long_ratio,
                   dialogue_ratio, best, avg_para, len(paras))


def verdict(m: Metrics) -> list[str]:
    bad = []
    lo, hi = TARGET_CHARS * (1 - CHAR_TOLERANCE), TARGET_CHARS * (1 + CHAR_TOLERANCE)
    if not lo <= m.chars <= hi:
        bad.append(f"분량 {m.chars}자 (목표 {int(lo)}~{int(hi)})")
    if m.avg_sentence > MAX_AVG_SENTENCE:
        bad.append(f"평균 문장 {m.avg_sentence:.1f}자 (목표 {MAX_AVG_SENTENCE} 이하)")
    if m.long_ratio > MAX_LONG_RATIO:
        bad.append(f"장문 비율 {m.long_ratio:.0%} (목표 {MAX_LONG_RATIO:.0%} 이하)")
    if m.dialogue_ratio < MIN_DIALOGUE_RATIO:
        bad.append(f"대사 비율 {m.dialogue_ratio:.0%} (목표 {MIN_DIALOGUE_RATIO:.0%} 이상)")
    if m.max_narration_run > MAX_NARRATION_RUN:
        bad.append(f"지문 연속 {m.max_narration_run}자 (목표 {MAX_NARRATION_RUN} 이하)")
    if m.avg_para_lines > MAX_AVG_PARA_LINES:
        bad.append(f"문단 평균 {m.avg_para_lines:.1f}줄 (목표 {MAX_AVG_PARA_LINES} 이하)")
    return bad


def main() -> int:
    paths = [Path(p) for p in sys.argv[1:]]
    if not paths:
        paths = sorted(Path("drafts").glob("*.md"))
    if not paths:
        print("측정할 파일이 없다.")
        return 1

    rows = [measure(p) for p in sorted(paths)]

    print(f"{'회차':<12}{'공백포함':>8}{'공백제외':>8}{'문장':>6}{'평균':>7}"
          f"{'장문':>7}{'대사':>7}{'지문연속':>9}{'문단줄':>7}")
    print("-" * 72)
    for m in rows:
        print(f"{m.name:<12}{m.chars:>8}{m.chars_nospace:>8}{m.sentences:>6}"
              f"{m.avg_sentence:>7.1f}{m.long_ratio:>7.0%}{m.dialogue_ratio:>7.0%}"
              f"{m.max_narration_run:>9}{m.avg_para_lines:>7.1f}")

    total = sum(m.chars for m in rows)
    spread = max(m.chars for m in rows) - min(m.chars for m in rows)
    print("-" * 72)
    print(f"{'합계':<12}{total:>8}   편차 {spread}자   평균 {total // len(rows)}자")

    failures = 0
    for m in rows:
        bad = verdict(m)
        if bad:
            failures += 1
            print(f"\n{m.name}")
            for b in bad:
                print(f"  - {b}")
    if not failures:
        print("\n전 회차 기준 통과.")
    return 1 if failures else 0


if __name__ == "__main__":
    try:
        import signal
        signal.signal(signal.SIGPIPE, signal.SIG_DFL)
    except (ImportError, AttributeError, ValueError):
        pass
    sys.exit(main())
