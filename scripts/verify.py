#!/usr/bin/env python3
"""세 층의 검증을 한 번에 돌린다.

  1층 구조  audit.py       데이터 정합성·페이스·페이월·카탈로그
  2층 서사  canon_check.py 설정·정보보유·인과·복선·현실성·회차 필요성·결제심사
  3층 문체  style_check.py 분량·문장·대사·문단

4층(사람)은 자동화하지 않는다. cutlines.html 블라인드 판정과 외부 파일럿이 그 층이다.

usage:
  python3 scripts/verify.py           # 전체
  python3 scripts/verify.py --quiet   # 실패한 층만
"""
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

LAYERS = [
    ("1층 구조", ["python3", "scripts/audit.py", "--strict"]),
    ("2층 서사", ["python3", "scripts/canon_check.py"]),
    ("3층 문체", ["python3", "scripts/style_check.py"]),
]


def main() -> int:
    quiet = "--quiet" in sys.argv
    results = []
    for name, cmd in LAYERS:
        proc = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True)
        ok = proc.returncode == 0
        results.append((name, ok))
        if not quiet or not ok:
            print(f"\n{'=' * 68}\n{name}  {'통과' if ok else '실패'}\n{'=' * 68}")
            print(proc.stdout.rstrip())
            if proc.stderr.strip():
                print(proc.stderr.rstrip())

    print(f"\n{'=' * 68}")
    for name, ok in results:
        print(f"  {name}  {'통과' if ok else '실패'}")
    print(f"{'=' * 68}")
    print("4층 사람 검증은 cutlines.html 블라인드 판정과 외부 파일럿으로 따로 한다.")
    return 0 if all(ok for _, ok in results) else 1


if __name__ == "__main__":
    sys.exit(main())
