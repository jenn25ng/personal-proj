#!/usr/bin/env python3
"""drafts/ 의 회차 본문을 모바일 리더 한 페이지로 렌더링한다.

usage: python3 scripts/render_reader.py S001 [out.html]
"""
import html
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def parse(path: Path) -> dict:
    raw = path.read_text(encoding="utf-8")
    meta, body = {}, raw
    if raw.startswith("---"):
        _, front, body = raw.split("---", 2)
        for line in front.strip().splitlines():
            if ":" in line:
                k, v = line.split(":", 1)
                meta[k.strip()] = v.strip()
    lines = body.strip().splitlines()
    title = next((l.lstrip("# ").strip() for l in lines if l.startswith("# ")), "")
    body = "\n".join(l for l in lines if not l.startswith("# "))
    return {"meta": meta, "title": title, "body": body.strip()}


def to_html(body: str) -> str:
    out = []
    for block in re.split(r"\n\s*\n", body):
        block = block.strip()
        if not block:
            continue
        if block == "---":
            out.append('<hr class="scene">')
            continue
        text = html.escape(block)
        text = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", text)
        text = re.sub(r"\*(.+?)\*", r"<em>\1</em>", text)
        text = text.replace("\n", "<br>")
        cls = " class=\"line\"" if text.lstrip().startswith("&quot;") or text.lstrip().startswith('"') else ""
        out.append(f"<p{cls}>{text}</p>")
    return "\n".join(out)


TEMPLATE = """<title>__TITLE__</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;600&family=Noto+Sans+KR:wght@400;500;700&display=swap">
<style>
  :root {
    --ground: #f7f5f2;
    --surface: #fffefb;
    --ink: #1b1a17;
    --ink-soft: #4a4640;
    --muted: #8b857a;
    --line: #e0dbd1;
    --accent: #8c3a2b;
    --on-accent: #fffefb;
  }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      --ground: #131211;
      --surface: #1a1917;
      --ink: #e9e5dd;
      --ink-soft: #bdb7ac;
      --muted: #8b857a;
      --line: #2e2b27;
      --accent: #d9836f;
      --on-accent: #17140f;
    }
  }
  :root[data-theme="dark"] {
    --ground: #131211;
    --surface: #1a1917;
    --ink: #e9e5dd;
    --ink-soft: #bdb7ac;
    --muted: #8b857a;
    --line: #2e2b27;
    --accent: #d9836f;
    --on-accent: #17140f;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: var(--ground);
    color: var(--ink);
    font-family: "Noto Serif KR", Georgia, serif;
    word-break: keep-all;
  }
  .bar {
    position: sticky; top: 0; z-index: 10;
    background: color-mix(in srgb, var(--ground) 92%, transparent);
    backdrop-filter: blur(8px);
    border-bottom: 1px solid var(--line);
  }
  .bar-inner {
    max-width: 34rem; margin: 0 auto; padding: .6875rem 1.25rem;
    display: flex; align-items: baseline; gap: .75rem;
    font-family: "Noto Sans KR", system-ui, sans-serif;
  }
  .bar strong { font-size: .875rem; font-weight: 700; }
  .bar span { font-size: .75rem; color: var(--muted); margin-left: auto; font-variant-numeric: tabular-nums; }
  main { max-width: 34rem; margin: 0 auto; padding: 2.5rem 1.25rem 5rem; }
  .ep { margin-bottom: 4rem; }
  .ep-no {
    font-family: "Noto Sans KR", sans-serif; font-size: .6875rem;
    font-weight: 700; letter-spacing: .16em; color: var(--accent);
  }
  h2 {
    font-size: 1.5rem; font-weight: 600; margin: .375rem 0 2rem;
    letter-spacing: -.01em; text-wrap: balance;
  }
  p { font-size: 1.0625rem; line-height: 2.05; margin: 0 0 1.375rem; color: var(--ink-soft); }
  p.line { color: var(--ink); }
  strong { font-weight: 600; color: var(--ink); }
  em { font-style: normal; color: var(--muted); }
  hr.scene {
    border: 0; height: 1px; background: var(--line);
    width: 3.5rem; margin: 2.5rem auto;
  }
  .meta {
    font-family: "Noto Sans KR", sans-serif; font-size: .75rem;
    color: var(--muted); border-top: 1px solid var(--line);
    padding-top: .875rem; margin-top: 2.5rem;
    display: flex; gap: 1rem; font-variant-numeric: tabular-nums;
  }
  .paywall {
    background: var(--surface); border: 1px solid var(--line);
    border-top: 3px solid var(--accent); border-radius: 3px;
    padding: 2rem 1.5rem; text-align: center;
    font-family: "Noto Sans KR", sans-serif;
    display: flex; flex-direction: column; gap: .875rem; align-items: center;
  }
  .paywall .tag {
    font-size: .6875rem; font-weight: 700; letter-spacing: .16em; color: var(--accent);
  }
  .paywall h3 { font-family: "Noto Serif KR", serif; font-size: 1.25rem; margin: 0; font-weight: 600; }
  .paywall p { font-size: .875rem; color: var(--muted); margin: 0; line-height: 1.7; max-width: 22rem; }
  .paywall button {
    font-family: inherit; font-size: .9375rem; font-weight: 500;
    background: var(--accent); color: var(--on-accent);
    border: 0; border-radius: 3px; padding: .75rem 2rem; cursor: pointer;
  }
  .paywall button:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }
  .paywall small { font-size: .75rem; color: var(--muted); }
</style>

<div class="bar">
  <div class="bar-inner">
    <strong>__SERIES__</strong>
    <span>무료 __FREE__화 · 총 __TOTAL__화</span>
  </div>
</div>

<main>
__EPISODES__

  <section class="paywall">
    <div class="tag">여기서 끊깁니다</div>
    <h3>6화. 하객 200명</h3>
    <p>__CUTLINE__</p>
    <button type="button" onclick="this.nextElementSibling.hidden=false;this.hidden=true">다음 화 보기</button>
    <small hidden>여기가 결제 지점입니다. 6화부터는 아직 쓰지 않았습니다.</small>
  </section>
</main>
"""


def main() -> int:
    sid = sys.argv[1] if len(sys.argv) > 1 else "S001"
    series = {s["id"]: s for s in json.loads(
        (ROOT / "data" / "series.json").read_text(encoding="utf-8"))["series"]}[sid]

    files = sorted((ROOT / "drafts").glob(f"{sid}-*.md"))
    if not files:
        print(f"{sid} 초고가 없다.")
        return 1

    blocks = []
    for f in files:
        d = parse(f)
        no = d["meta"].get("episode", "?")
        chars = len(d["body"].replace("\n", ""))
        blocks.append(
            f'  <article class="ep">\n'
            f'    <div class="ep-no">EPISODE {int(no):02d}</div>\n'
            f'    <h2>{html.escape(d["title"].split(". ", 1)[-1])}</h2>\n'
            f'{to_html(d["body"])}\n'
            f'    <div class="meta"><span>{chars}자</span>'
            f'<span>{"무료" if d["meta"].get("isFree") == "true" else "유료"}</span></div>\n'
            f'  </article>')

    page = (TEMPLATE
            .replace("__TITLE__", html.escape(series["title"]))
            .replace("__SERIES__", html.escape(series["title"]))
            .replace("__FREE__", str(series["freeEpisodes"]))
            .replace("__TOTAL__", str(series["totalEpisodes"]))
            .replace("__CUTLINE__", html.escape(series["freeCutLine"]))
            .replace("__EPISODES__", "\n\n".join(blocks)))

    out = Path(sys.argv[2]) if len(sys.argv) > 2 else ROOT / f"reader-{sid}.html"
    out.write_text(page, encoding="utf-8")
    print(f"{out} 생성 완료: {len(files)}화")
    return 0


if __name__ == "__main__":
    sys.exit(main())
