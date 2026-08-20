#!/usr/bin/env python3
"""읽지 않고 잡히는 구조 결함을 데이터에서 검출한다.

series.json / episodes.json 을 교차 검증해 다음을 찾는다.

  정합성   회차 수, 번호 연속, 무료 컷 위치, 필드 누락
  페이스   무료분 사건 밀도, 막 구성 편중, 절정 지연
  페이월   비밀의 무료분 조기 공개, 컷 라인 종결형, 무료 비율
  카탈로그 슬롯 조합 중복, 제목·로그라인 유사도

usage:
  python3 scripts/audit.py              # 사람이 읽는 리포트
  python3 scripts/audit.py --json       # 기계가 읽는 결과
  python3 scripts/audit.py --level high # high 이상만
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter, defaultdict
from dataclasses import dataclass, asdict
from itertools import combinations
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

LEVELS = ("high", "medium", "low")
ACTS = ("발단", "전개", "위기", "절정", "결말")

# 무료 비율 실질 구간. 12화짜리는 1화가 8%라 25~30% 안에 들어갈 수가 없다.
FREE_RATIO_MIN = 0.18
FREE_RATIO_MAX = 0.35

# 컷 라인이 '이미 닫힌 문장'으로 끝나는 패턴. 다음 화가 궁금해지지 않는다.
CLOSED_ENDINGS = ("있었다.", "이었다.", "였다.", "었다.", "았다.", "된다.", "이다.")
# 반대로 다음 화를 여는 장치들
OPEN_MARKERS = ('"', "“", "”", "?", "D-", "직전", "순간", "그리고")

JOSA = re.compile(r"(의|을|를|이|가|은|는|에|와|과|로|으로)$")


@dataclass
class Finding:
    level: str
    code: str
    target: str
    message: str
    reviewed: str = ""


def load_reviewed() -> dict:
    path = ROOT / "data" / "reviewed.json"
    if not path.exists():
        return {}
    raw = json.loads(path.read_text(encoding="utf-8"))
    return {k: v for k, v in raw.items() if not k.startswith("_")}


def norm_tokens(text: str) -> list[str]:
    """슬롯 값에서 조사를 떼고 2글자 이상 토큰만 남긴다."""
    out = []
    for raw in re.split(r"[\s+/·]+", text):
        t = JOSA.sub("", raw.strip())
        if len(t) >= 2:
            out.append(t)
    return out


def bigrams(text: str) -> set[str]:
    s = re.sub(r"\s+", "", text)
    return {s[i:i + 2] for i in range(len(s) - 1)}


def jaccard(a: set[str], b: set[str]) -> float:
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)


# ---------------------------------------------------------------- 정합성

def check_integrity(s: dict, eps: list[dict]) -> list[Finding]:
    sid, out = s["id"], []
    if not eps:
        return [Finding("high", "no-episodes", sid, "회차 데이터가 없다.")]

    if len(eps) != s["totalEpisodes"]:
        out.append(Finding("high", "episode-count", sid,
                           f"회차 {len(eps)}개, totalEpisodes 는 {s['totalEpisodes']}."))
    for i, e in enumerate(eps, 1):
        if e["ep"] != i:
            out.append(Finding("high", "episode-order", sid,
                               f"{i}번째 회차의 ep 가 {e['ep']}."))
            break
        if not e.get("synopsis", "").strip():
            out.append(Finding("high", "empty-synopsis", sid, f"{i}화 시놉시스가 비었다."))
        if e.get("act") not in ACTS:
            out.append(Finding("medium", "unknown-act", sid,
                               f"{i}화의 act 가 {e.get('act')!r}."))

    cuts = [e["ep"] for e in eps if e.get("isFreeCut")]
    if len(cuts) != 1:
        out.append(Finding("high", "cut-count", sid, f"무료 컷 표시가 {len(cuts)}개."))
    elif cuts[0] != s["freeEpisodes"]:
        out.append(Finding("high", "cut-position", sid,
                           f"무료 컷이 {cuts[0]}화인데 freeEpisodes 는 {s['freeEpisodes']}."))

    wrong = [e["ep"] for e in eps if e.get("isFree") != (e["ep"] <= s["freeEpisodes"])]
    if wrong:
        out.append(Finding("high", "free-flag", sid,
                           f"isFree 플래그가 어긋난 회차: {wrong[:5]}."))
    return out


# ---------------------------------------------------------------- 페이스

def check_pacing(s: dict, eps: list[dict]) -> list[Finding]:
    sid, out = s["id"], []
    total, free_n = s["totalEpisodes"], s["freeEpisodes"]
    free = [e for e in eps if e["ep"] <= free_n]

    free_acts = {e["act"] for e in free}
    if free_acts <= {"발단"}:
        out.append(Finding("high", "slow-free", sid,
                           f"무료 {free_n}화가 전부 발단이다. 4화까지 사건이 없으면 무료분에서 이탈한다."))
    elif len(free_acts) == 1:
        out.append(Finding("medium", "flat-free", sid,
                           f"무료분의 막이 {free_acts.pop()} 하나뿐이다. 전환이 없다."))

    counts = Counter(e["act"] for e in eps)
    if not counts.get("위기"):
        out.append(Finding("medium", "no-crisis", sid, "위기 단계가 없다. 중반이 비어 있다."))

    intro_ratio = counts.get("발단", 0) / total
    if intro_ratio > 0.30:
        out.append(Finding("medium", "long-setup", sid,
                           f"발단이 전체의 {intro_ratio:.0%}다. 도입이 길면 중반 이탈이 커진다."))

    climax = [e["ep"] for e in eps if e["act"] == "절정"]
    if climax and climax[0] / total > 0.85:
        out.append(Finding("medium", "late-climax", sid,
                           f"절정이 {climax[0]}/{total}화에서 시작한다. 너무 늦다."))

    if counts.get("결말", 0) == 1 and total >= 16:
        out.append(Finding("low", "rushed-ending", sid,
                           f"{total}화짜리인데 결말이 1화뿐이다. 마무리가 급하다."))

    runs = max((sum(1 for _ in grp) for grp in _runs(e["act"] for e in eps)), default=0)
    if runs >= 8:
        out.append(Finding("low", "act-plateau", sid,
                           f"같은 막이 {runs}화 연속이다. 중간에 판이 안 바뀐다."))
    return out


def _runs(seq):
    cur, prev = [], object()
    for x in seq:
        if x != prev and cur:
            yield cur
            cur = []
        cur.append(x)
        prev = x
    if cur:
        yield cur


# ---------------------------------------------------------------- 페이월

def check_paywall(s: dict, eps: list[dict]) -> list[Finding]:
    sid, out = s["id"], []
    total, free_n = s["totalEpisodes"], s["freeEpisodes"]

    ratio = free_n / total
    if not (FREE_RATIO_MIN - 1e-9 <= ratio <= FREE_RATIO_MAX + 1e-9):
        out.append(Finding("low", "free-ratio", sid,
                           f"무료 비율 {ratio:.0%} ({free_n}/{total}). 권장은 18~35%."))

    # 비밀이 무료분에서 이미 공개되면 결제할 이유가 사라진다.
    secret = s.get("slots", {}).get("비밀", "")
    # 제목이나 로그라인에 이미 나온 말은 독자에게 약속된 전제다. 비밀로 세지 않는다.
    premise = s["title"] + " " + s["logline"]
    tokens = [t for t in norm_tokens(secret) if t not in premise]
    # 컷 회차에서 장치가 보이는 것은 설계대로다. 그 앞에서 보이는 것만 본다.
    before_cut = [e for e in eps if e["ep"] < free_n]
    free_text = " ".join(e["synopsis"] for e in before_cut)
    hits = [t for t in tokens if t in free_text]
    if hits:
        hit_ep = next(e for e in before_cut if any(t in e["synopsis"] for t in hits))
        out.append(Finding("medium", "secret-early", sid,
                           f"비밀 장치({secret})가 컷보다 앞선 {hit_ep['ep']}화에 보인다"
                           f"[{', '.join(hits)}] — \"{hit_ep['synopsis']}\" "
                           "존재만 노출된 것인지 정체까지 공개된 것인지 확인할 것."))

    line = s.get("freeCutLine", "")
    if line.endswith(CLOSED_ENDINGS) and not any(m in line for m in OPEN_MARKERS):
        out.append(Finding("medium", "declarative-cutline", sid,
                           "컷 라인이 서술로 닫힌다. 대사·의문·D-day 같이 다음 화를 여는 장치가 없으니, "
                           "감춘 것이 있어 버티는지 직접 읽어 확인할 것."))
    if len(line) < 25:
        out.append(Finding("low", "short-cutline", sid,
                           f"컷 라인이 {len(line)}자다. 장면이 서기 전에 끝난다."))

    # 카드에 적힌 컷 라인은 무료 마지막 화의 마지막 문장이어야 한다. 다른 화를
    # 가리키면 훅이 무료분 안에서 소진되거나(앞), 유료 내용을 미리 노출한다(뒤).
    if line:
        cl = bigrams(line)
        scored = sorted(((jaccard(cl, bigrams(e["synopsis"])), e["ep"]) for e in eps),
                        reverse=True)
        best_score, best_ep = scored[0]
        if best_score < 0.15:
            out.append(Finding("medium", "cutline-orphan", sid,
                               "컷 라인에 대응하는 회차를 특정할 수 없다. "
                               "회차 시놉시스에 없는 장면이거나 표현이 너무 멀다."))
        elif best_ep != free_n and best_score >= 0.30:
            where = "무료분 안에서 이미 지나간" if best_ep < free_n else "유료 구간의"
            out.append(Finding("high", "cutline-drift", sid,
                               f"컷 라인이 {where} {best_ep}화를 가리킨다(유사도 {best_score:.0%}). "
                               f"페이월은 {free_n}화다."))

    cut_ep = next((e for e in eps if e.get("isFreeCut")), None)
    if cut_ep and cut_ep["act"] == "결말":
        out.append(Finding("high", "cut-in-ending", sid, "무료 컷이 결말 구간에 있다."))
    if cut_ep and cut_ep["act"] == "발단":
        out.append(Finding("high", "cut-in-setup", sid,
                           f"무료 컷인 {cut_ep['ep']}화가 발단이다. 컷은 사건이 도는 지점이어야 한다."))
    return out


# ---------------------------------------------------------------- 카탈로그

def check_catalog(series: list[dict]) -> list[Finding]:
    out = []

    freq = defaultdict(Counter)
    for s in series:
        for k, v in s.get("slots", {}).items():
            freq[k][v] += 1
    for slot, c in freq.items():
        for value, n in c.items():
            if n >= 4:
                out.append(Finding("low", "slot-overused", f"slot:{slot}",
                                   f"'{value}' 가 {n}편에서 반복된다."))

    for a, b in combinations(series, 2):
        shared = [k for k in a.get("slots", {})
                  if a["slots"].get(k) == b.get("slots", {}).get(k)]
        if len(shared) >= 3:
            out.append(Finding("high", "near-duplicate", f"{a['id']}+{b['id']}",
                               f"슬롯 4개 중 {len(shared)}개가 같다 ({', '.join(shared)}). 사실상 같은 이야기다."))

        t = jaccard(bigrams(a["title"]), bigrams(b["title"]))
        if t >= 0.40:
            out.append(Finding("medium", "similar-title", f"{a['id']}+{b['id']}",
                               f"제목 유사도 {t:.0%}: '{a['title']}' / '{b['title']}'"))

        l = jaccard(bigrams(a["logline"]), bigrams(b["logline"]))
        if l >= 0.35:
            out.append(Finding("medium", "similar-logline", f"{a['id']}+{b['id']}",
                               f"로그라인 유사도 {l:.0%} ({a['id']} / {b['id']})"))

    genres = Counter(s["genre"] for s in series)
    top, n = genres.most_common(1)[0]
    if n / len(series) > 0.25:
        out.append(Finding("low", "genre-skew", "catalog",
                           f"'{top}' 장르가 전체의 {n / len(series):.0%}다. 카탈로그가 한쪽으로 쏠린다."))
    return out


# ---------------------------------------------------------------- 실행

def run() -> tuple[list[Finding], dict]:
    series = json.loads((ROOT / "data" / "series.json").read_text(encoding="utf-8"))["series"]
    episodes = json.loads((ROOT / "data" / "episodes.json").read_text(encoding="utf-8"))["episodes"]

    findings: list[Finding] = []
    for s in series:
        eps = episodes.get(s["id"], [])
        findings += check_integrity(s, eps)
        if eps:
            findings += check_pacing(s, eps)
            findings += check_paywall(s, eps)
    findings += check_catalog(series)

    reviewed = load_reviewed()
    for f in findings:
        f.reviewed = reviewed.get(f.code, {}).get(f.target, "")

    acts = Counter(e["act"] for v in episodes.values() for e in v)
    stats = {
        "seriesCount": len(series),
        "episodeCount": sum(len(v) for v in episodes.values()),
        "genreCount": len({s["genre"] for s in series}),
        "actDistribution": {a: acts.get(a, 0) for a in ACTS},
        "avgFreeRatio": round(
            sum(s["freeEpisodes"] / s["totalEpisodes"] for s in series) / len(series), 3),
    }
    return findings, stats


def report(findings: list[Finding], stats: dict, min_level: str,
           show_reviewed: bool = False) -> None:
    cutoff = LEVELS.index(min_level)
    open_findings = [f for f in findings if not f.reviewed]
    done = [f for f in findings if f.reviewed]
    pool = findings if show_reviewed else open_findings
    shown = [f for f in pool if LEVELS.index(f.level) <= cutoff]
    counts = Counter(f.level for f in open_findings)

    print("구조 검증 리포트")
    print("=" * 60)
    print(f"시리즈 {stats['seriesCount']}편 · {stats['episodeCount']}회차 · "
          f"{stats['genreCount']}장르 · 평균 무료 비율 {stats['avgFreeRatio']:.0%}")
    dist = stats["actDistribution"]
    total_eps = sum(dist.values()) or 1
    print("막 분포   " + "  ".join(f"{a} {n / total_eps:>4.0%}" for a, n in dist.items()))
    print()
    print(f"미해결  high {counts.get('high', 0)}  "
          f"medium {counts.get('medium', 0)}  low {counts.get('low', 0)}"
          f"   ·   검토 완료 {len(done)}건")
    print("=" * 60)

    if not shown:
        print(f"\n{min_level} 이상 미해결 없음. (검토 완료 {len(done)}건)")
        return

    for level in LEVELS[:cutoff + 1]:
        group = [f for f in shown if f.level == level]
        if not group:
            continue
        print(f"\n[{level.upper()}]  {len(group)}건")
        print("-" * 60)
        for f in sorted(group, key=lambda x: (x.code, x.target)):
            tag = "✓ " if f.reviewed else "  "
            print(f"{tag}{f.target:<14} {f.code:<16} {f.message}")
            if f.reviewed:
                print(f"{'':<18}{'':<16} └ 검토: {f.reviewed}")


def main() -> int:
    # `audit.py | head` 로 잘릴 때 traceback 대신 조용히 끝낸다.
    try:
        import signal
        signal.signal(signal.SIGPIPE, signal.SIG_DFL)
    except (ImportError, AttributeError, ValueError):
        pass

    ap = argparse.ArgumentParser(description="막장 드라마 데이터 구조 검증")
    ap.add_argument("--json", action="store_true", help="JSON 으로 출력")
    ap.add_argument("--level", choices=LEVELS, default="low", help="이 심각도 이상만 출력")
    ap.add_argument("--strict", action="store_true", help="미해결 high 가 있으면 1을 반환")
    ap.add_argument("--show-reviewed", action="store_true",
                    help="검토 완료로 처리된 항목도 함께 출력")
    args = ap.parse_args()

    findings, stats = run()

    if args.json:
        print(json.dumps(
            {"stats": stats, "findings": [asdict(f) for f in findings]},
            ensure_ascii=False, indent=2))
    else:
        report(findings, stats, args.level, args.show_reviewed)

    if args.strict and any(f.level == "high" and not f.reviewed for f in findings):
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
