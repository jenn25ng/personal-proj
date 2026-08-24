#!/usr/bin/env python3
"""서사 논리를 검증한다. 구조(audit.py)와 문체(style_check.py) 사이의 층.

data/canon/<시리즈>.json 에 기록된 일곱 가지를 초고와 대조한다.

  1 고정 설정표      금지표현이 초고에 남아 있는지
  2 인물별 정보보유표 집필된 회차가 다 있는지, 알던 것을 다시 모르게 되지 않는지
  3 원인-행동-결과   집필된 회차마다 행동이 있고 why/result 가 채워졌는지
  4 반전 역검증      복선이 회수보다 먼저 심겼는지, 심은 회차가 집필 범위 안인지
  5 현실성 검증      항목마다 상태와 근거가 있는지
  6 회차 삭제 테스트 회차마다 새 사실·선택·관계 변화가 하나씩 있는지
  7 결제 반대 심사   무료 마지막 화에 반론과 답변이 있는지

usage:
  python3 scripts/canon_check.py            # data/canon/ 전체
  python3 scripts/canon_check.py S056
"""
from __future__ import annotations

import json
import sys
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VALID_STATUS = {"확인", "가정", "일반 사양", "정정 완료"}


@dataclass
class Issue:
    step: str
    message: str


def drafts_of(sid: str) -> dict[int, str]:
    out = {}
    for f in sorted((ROOT / "drafts").glob(f"{sid}-*.md")):
        try:
            ep = int(f.stem.split("-")[1])
        except (IndexError, ValueError):
            continue
        out[ep] = f.read_text(encoding="utf-8")
    return out


def check(canon: dict) -> list[Issue]:
    sid = canon["series"]
    upto = canon["draftedThrough"]
    drafted = list(range(1, upto + 1))
    texts = drafts_of(sid)
    issues: list[Issue] = []

    missing = [e for e in drafted if e not in texts]
    if missing:
        issues.append(Issue("0 초고", f"draftedThrough={upto} 인데 {missing} 화 초고가 없다."))

    # 1 고정 설정표
    for ban in canon.get("금지표현", []):
        hits = [e for e, t in texts.items() if ban["text"] in t]
        if hits:
            issues.append(Issue("1 설정표",
                                f"금지표현 '{ban['text']}' 가 {hits} 화에 남아 있다. — {ban['reason']}"))
    if not canon.get("고정설정표", {}).get("인물"):
        issues.append(Issue("1 설정표", "인물 설정이 비었다."))

    # 2 인물별 정보보유표
    ledger = {row["ep"]: row for row in canon.get("인물별_정보보유표", [])}
    for e in drafted:
        if e not in ledger:
            issues.append(Issue("2 정보보유", f"{e}화 정보보유표가 없다."))
    known: dict[str, set] = {}
    for e in sorted(ledger):
        for who, box in ledger[e].items():
            if who == "ep" or not isinstance(box, dict):
                continue
            seen = known.setdefault(who, set())
            regressed = seen & set(box.get("notKnows", []))
            if regressed:
                issues.append(Issue("2 정보보유",
                                    f"{e}화에서 {who}가 이미 알던 것을 다시 모른다: {sorted(regressed)}"))
            seen |= set(box.get("knows", []))

    # 3 원인-행동-결과
    acts = canon.get("원인_행동_결과", [])
    for e in drafted:
        rows = [a for a in acts if a.get("ep") == e]
        if not rows:
            issues.append(Issue("3 인과", f"{e}화에 등록된 주요 행동이 없다."))
        for a in rows:
            if not a.get("why", "").strip():
                issues.append(Issue("3 인과", f"{e}화 '{a.get('action','')}' 에 why 가 비었다."))
            if not a.get("result", "").strip():
                issues.append(Issue("3 인과", f"{e}화 '{a.get('action','')}' 에 result 가 비었다."))

    # 4 반전 역검증
    for p in canon.get("반전_역검증", []):
        if p["plantedIn"] >= p["paysOffIn"]:
            issues.append(Issue("4 역검증",
                                f"'{p['plant']}' 는 {p['plantedIn']}화에 심고 {p['paysOffIn']}화에 회수한다. 순서가 뒤집혔다."))
        # 집필 전에 canon 을 먼저 쓰는 경우(draftedThrough=0)에는 이 검사를 건너뛴다.
        if upto > 0 and p["plantedIn"] > upto:
            issues.append(Issue("4 역검증", f"'{p['plant']}' 를 아직 안 쓴 {p['plantedIn']}화에 심었다고 적혀 있다."))
        if not p.get("reread", "").strip():
            issues.append(Issue("4 역검증", f"'{p['plant']}' 에 재독 시 해석이 비었다."))

    # 5 현실성 검증
    real = canon.get("현실성_검증", [])
    if not real:
        issues.append(Issue("5 현실성", "현실성 검증 항목이 하나도 없다."))
    for r in real:
        if r.get("status") not in VALID_STATUS:
            issues.append(Issue("5 현실성",
                                f"'{r.get('item','')}' 의 status 가 {r.get('status')!r}. "
                                f"{sorted(VALID_STATUS)} 중 하나여야 한다."))
        if not r.get("source", "").strip():
            issues.append(Issue("5 현실성", f"'{r.get('item','')}' 에 근거가 비었다."))

    # 6 회차 삭제 테스트
    del_rows = {d["ep"]: d for d in canon.get("회차_삭제_테스트", [])}
    for e in drafted:
        row = del_rows.get(e)
        if not row:
            issues.append(Issue("6 삭제테스트", f"{e}화 항목이 없다."))
            continue
        filled = [k for k in ("newFact", "choice", "relationshipChange") if row.get(k, "").strip()]
        if not filled:
            issues.append(Issue("6 삭제테스트",
                                f"{e}화에 새 사실·선택·관계 변화가 하나도 없다. 빼도 되는 회차다."))

    # 7 결제 반대 심사
    pay = canon.get("결제_반대_심사", {})
    for field in ("objection", "answer", "verdict"):
        if not pay.get(field, "").strip():
            issues.append(Issue("7 결제심사", f"{field} 가 비었다."))
    if pay.get("verdict") not in ("통과", "보류", "탈락", ""):
        issues.append(Issue("7 결제심사", f"verdict 가 {pay.get('verdict')!r}. 통과/보류/탈락 중 하나여야 한다."))

    return issues


def main() -> int:
    files = sorted((ROOT / "data" / "canon").glob("*.json"))
    if len(sys.argv) > 1:
        files = [ROOT / "data" / "canon" / f"{sys.argv[1]}.json"]
    if not files or not files[0].exists():
        print("검증할 canon 파일이 없다.")
        return 1

    failed = 0
    for f in files:
        canon = json.loads(f.read_text(encoding="utf-8"))
        issues = check(canon)
        print(f"서사 검증 — {canon['series']} {canon['title']}")
        print("=" * 64)
        upto = canon["draftedThrough"]
        print("집필 범위 " + (f"1~{upto}화" if upto else "없음 (canon 선작성)"))
        print("-" * 64)
        if not issues:
            print("일곱 단계 모두 통과.")
        else:
            failed += 1
            for i in issues:
                print(f"  [{i.step}] {i.message}")
        print()
    return 1 if failed else 0


if __name__ == "__main__":
    try:
        import signal
        signal.signal(signal.SIGPIPE, signal.SIG_DFL)
    except (ImportError, AttributeError, ValueError):
        pass
    sys.exit(main())
