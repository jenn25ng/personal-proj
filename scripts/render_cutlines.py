#!/usr/bin/env python3
"""무료 컷 라인 60개를 블라인드 판정용 한 페이지로 렌더링한다.

usage: python3 scripts/render_cutlines.py [out.html]
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

HTML = """<title>무료 컷 판정소</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Nanum+Myeongjo:wght@400;700;800&family=Noto+Sans+KR:wght@400;500;700&display=swap">
<style>
  :root {
    --ground: #eceff3;
    --surface: #ffffff;
    --surface-2: #f6f8fa;
    --ink: #14171c;
    --muted: #667085;
    --line: #d7dce3;
    --accent: #2f4a8c;
    --on-accent: #ffffff;
    --cut: #9e2b3c;
    --shadow: 0 1px 2px rgba(20, 23, 28, .06), 0 8px 24px rgba(20, 23, 28, .05);
  }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      --ground: #0f1216;
      --surface: #181c22;
      --surface-2: #1f242b;
      --ink: #e8ebef;
      --muted: #8b94a3;
      --line: #2c333c;
      --accent: #8aa6e6;
      --on-accent: #101319;
      --cut: #d4697a;
      --shadow: 0 1px 2px rgba(0, 0, 0, .4), 0 8px 24px rgba(0, 0, 0, .3);
    }
  }
  :root[data-theme="dark"] {
    --ground: #0f1216;
    --surface: #181c22;
    --surface-2: #1f242b;
    --ink: #e8ebef;
    --muted: #8b94a3;
    --line: #2c333c;
    --accent: #8aa6e6;
    --on-accent: #101319;
    --cut: #d4697a;
    --shadow: 0 1px 2px rgba(0, 0, 0, .4), 0 8px 24px rgba(0, 0, 0, .3);
  }

  * { box-sizing: border-box; }

  body {
    margin: 0;
    background: var(--ground);
    color: var(--ink);
    font-family: "Noto Sans KR", system-ui, -apple-system, sans-serif;
    line-height: 1.6;
    word-break: keep-all;
  }

  .label {
    font-size: .688rem;
    font-weight: 700;
    letter-spacing: .14em;
    color: var(--muted);
  }

  /* ---- 상단 고정 바 ---- */
  .bar {
    position: sticky;
    top: 0;
    z-index: 10;
    background: color-mix(in srgb, var(--ground) 92%, transparent);
    backdrop-filter: blur(8px);
    border-bottom: 1px solid var(--line);
  }
  .bar-inner {
    max-width: 44rem;
    margin: 0 auto;
    padding: .75rem 1.25rem .5rem;
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: .5rem 1rem;
  }
  .bar h1 {
    font-family: "Nanum Myeongjo", Georgia, serif;
    font-size: 1.0625rem;
    font-weight: 800;
    margin: 0;
    letter-spacing: -.01em;
  }
  .tally {
    margin-left: auto;
    display: flex;
    gap: .875rem;
    font-size: .8125rem;
    font-variant-numeric: tabular-nums;
    color: var(--muted);
  }
  .tally b { color: var(--ink); font-weight: 700; }
  .tally .no b { color: var(--cut); }
  .track {
    height: 2px;
    background: var(--line);
  }
  .track > i {
    display: block;
    height: 100%;
    width: 0;
    background: var(--accent);
    transition: width .3s ease;
  }

  /* ---- 본문 ---- */
  main {
    max-width: 44rem;
    margin: 0 auto;
    padding: 2rem 1.25rem 6rem;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .intro {
    border-left: 2px solid var(--accent);
    padding: .125rem 0 .125rem 1rem;
    display: flex;
    flex-direction: column;
    gap: .5rem;
  }
  .intro p { margin: 0; font-size: .9375rem; color: var(--muted); max-width: 34rem; }
  .intro p strong { color: var(--ink); font-weight: 500; }

  .toolbar { display: flex; gap: .5rem; flex-wrap: wrap; }

  button {
    font-family: inherit;
    font-size: .8125rem;
    font-weight: 500;
    color: var(--ink);
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 3px;
    padding: .4375rem .875rem;
    cursor: pointer;
    transition: background .15s ease, border-color .15s ease;
  }
  button:hover { background: var(--surface-2); border-color: var(--muted); }
  button:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

  /* ---- 카드 ---- */
  .card {
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 3px;
    box-shadow: var(--shadow);
    padding: 1.5rem 1.5rem 0;
    display: flex;
    flex-direction: column;
    gap: 1.125rem;
  }
  .card.done {
    box-shadow: none;
    padding-bottom: 1.125rem;
    gap: .875rem;
  }

  .card-head {
    display: flex;
    align-items: baseline;
    gap: .75rem;
  }
  .num {
    font-variant-numeric: tabular-nums;
    font-size: .75rem;
    font-weight: 700;
    letter-spacing: .1em;
    color: var(--muted);
  }
  .blind {
    font-size: .688rem;
    letter-spacing: .1em;
    color: var(--muted);
    border: 1px dashed var(--line);
    border-radius: 2px;
    padding: .0625rem .4375rem;
  }
  .card.done .blind { display: none; }

  .line {
    font-family: "Nanum Myeongjo", Georgia, serif;
    font-size: 1.375rem;
    font-weight: 700;
    line-height: 1.75;
    letter-spacing: -.005em;
    margin: 0;
  }
  .card.done .line {
    font-size: 1rem;
    font-weight: 400;
    line-height: 1.7;
    color: var(--muted);
  }

  /* 절단면 */
  .cut {
    border-top: 1px dashed var(--line);
    margin-top: .375rem;
    padding-top: .875rem;
    position: relative;
  }
  .cut::before {
    content: "여기서 끊깁니다";
    position: absolute;
    top: -.5rem;
    left: 0;
    background: var(--surface);
    padding-right: .625rem;
    font-size: .625rem;
    font-weight: 700;
    letter-spacing: .14em;
    color: var(--cut);
  }
  .choices {
    display: flex;
    gap: .5rem;
    padding-bottom: 1.5rem;
  }
  .choices button { flex: 1; padding: .625rem; font-size: .875rem; font-weight: 500; }
  .choices .yes { background: var(--accent); color: var(--on-accent); border-color: var(--accent); }
  .choices .yes:hover { background: color-mix(in srgb, var(--accent) 85%, var(--ink)); }
  .choices .no { color: var(--cut); border-color: color-mix(in srgb, var(--cut) 40%, var(--line)); }
  .choices .no:hover { background: color-mix(in srgb, var(--cut) 8%, var(--surface)); border-color: var(--cut); }
  .card.done .cut, .card.done .choices { display: none; }

  /* 판정 후 공개 */
  .reveal { display: none; }
  .card.done .reveal {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: .5rem .75rem;
    border-top: 1px solid var(--line);
    padding-top: .875rem;
  }
  @media (prefers-reduced-motion: no-preference) {
    .card.done .reveal { animation: rise .25s ease-out; }
  }
  @keyframes rise { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: none; } }

  .chip {
    font-size: .688rem;
    font-weight: 700;
    letter-spacing: .08em;
    border: 1px solid var(--line);
    border-radius: 2px;
    padding: .0625rem .4375rem;
    color: var(--muted);
  }
  .reveal .title {
    font-family: "Nanum Myeongjo", Georgia, serif;
    font-size: 1rem;
    font-weight: 700;
  }
  .reveal .eps {
    font-size: .75rem;
    color: var(--muted);
    font-variant-numeric: tabular-nums;
    margin-left: auto;
  }
  .verdict { font-size: .75rem; font-weight: 700; }
  .verdict.y { color: var(--accent); }
  .verdict.n { color: var(--cut); }

  /* ---- 결과 ---- */
  .result {
    display: none;
    background: var(--surface);
    border: 1px solid var(--line);
    border-top: 3px solid var(--accent);
    border-radius: 3px;
    padding: 1.5rem;
    flex-direction: column;
    gap: 1rem;
  }
  .result.on { display: flex; }
  .result h2 {
    font-family: "Nanum Myeongjo", Georgia, serif;
    font-size: 1.25rem;
    margin: 0;
  }
  .score {
    font-variant-numeric: tabular-nums;
    font-size: 2.75rem;
    font-family: "Nanum Myeongjo", Georgia, serif;
    font-weight: 800;
    line-height: 1;
  }
  .score small { font-size: .875rem; font-weight: 400; color: var(--muted); margin-left: .375rem; font-family: "Noto Sans KR", sans-serif; }
  .verdict-note { margin: 0; font-size: .875rem; color: var(--muted); }
  .fails { display: flex; flex-direction: column; gap: .5rem; margin: 0; padding: 0; list-style: none; }
  .fails li {
    display: flex;
    gap: .625rem;
    align-items: baseline;
    font-size: .875rem;
    border-bottom: 1px solid var(--line);
    padding-bottom: .5rem;
  }
  .fails li:last-child { border-bottom: 0; padding-bottom: 0; }
  .fails .id { font-size: .688rem; font-weight: 700; color: var(--muted); font-variant-numeric: tabular-nums; }

  footer {
    max-width: 44rem;
    margin: 0 auto;
    padding: 0 1.25rem 3rem;
    font-size: .75rem;
    color: var(--muted);
  }
</style>

<div class="bar">
  <div class="bar-inner">
    <h1>무료 컷 판정소</h1>
    <div class="tally">
      <span>판정 <b id="t-done">0</b> / __N__</span>
      <span>본다 <b id="t-yes">0</b></span>
      <span class="no">안 본다 <b id="t-no">0</b></span>
    </div>
  </div>
  <div class="track"><i id="t-bar"></i></div>
</div>

<main>
  <section class="intro">
    <p><strong>무료 마지막 화의 마지막 문장 __N__개입니다.</strong> 제목과 장르는 가려져 있습니다 — 시리즈를 알면 이미 궁금해진 상태라 판정이 무의미해지기 때문입니다.</p>
    <p>각 문장을 읽고 <strong>여기서 결제하고 다음 화를 볼 것인지</strong>만 답하세요. 판정하면 정체가 공개됩니다.</p>
    <div class="toolbar">
      <button id="shuffle" type="button">순서 섞기</button>
      <button id="reset" type="button">처음부터</button>
    </div>
  </section>

  <div id="deck"></div>

  <section class="result" id="result">
    <div>
      <div class="label">결제 전환 가능성</div>
      <div class="score"><span id="r-pct">0</span>%<small id="r-frac"></small></div>
    </div>
    <p class="verdict-note" id="r-note"></p>
    <div>
      <div class="label" style="margin-bottom:.625rem">다시 써야 할 컷 라인</div>
      <ul class="fails" id="r-fails"></ul>
    </div>
  </section>
</main>

<footer>data/series.json 의 freeCutLine 필드에서 생성됨 · scripts/render_cutlines.py</footer>

<script id="data" type="application/json">__DATA__</script>
<script>
  (function () {
    var ALL = JSON.parse(document.getElementById("data").textContent);
    var deck = document.getElementById("deck");
    var result = document.getElementById("result");
    var order = ALL.slice();
    var votes = {};

    function shuffle(a) {
      for (var i = a.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var t = a[i]; a[i] = a[j]; a[j] = t;
      }
      return a;
    }

    function render() {
      deck.textContent = "";
      var frag = document.createDocumentFragment();
      order.forEach(function (item, idx) {
        var card = document.createElement("article");
        card.className = "card";
        card.id = "c-" + item.id;

        var head = document.createElement("div");
        head.className = "card-head";
        var num = document.createElement("span");
        num.className = "num";
        num.textContent = String(idx + 1).padStart(2, "0") + " / " + order.length;
        var blind = document.createElement("span");
        blind.className = "blind";
        blind.textContent = "제목 · 장르 가림";
        head.appendChild(num);
        head.appendChild(blind);

        var line = document.createElement("p");
        line.className = "line";
        line.textContent = item.line;

        var cut = document.createElement("div");
        cut.className = "cut";

        var choices = document.createElement("div");
        choices.className = "choices";
        var yes = document.createElement("button");
        yes.type = "button";
        yes.className = "yes";
        yes.textContent = "다음 화 본다";
        var no = document.createElement("button");
        no.type = "button";
        no.className = "no";
        no.textContent = "안 본다";
        choices.appendChild(yes);
        choices.appendChild(no);

        var reveal = document.createElement("div");
        reveal.className = "reveal";
        var chip = document.createElement("span");
        chip.className = "chip";
        chip.textContent = item.genre;
        var title = document.createElement("span");
        title.className = "title";
        title.textContent = item.title;
        var verdict = document.createElement("span");
        verdict.className = "verdict";
        var eps = document.createElement("span");
        eps.className = "eps";
        eps.textContent = "총 " + item.total + "화 · 무료 " + item.free + "화";
        reveal.appendChild(chip);
        reveal.appendChild(title);
        reveal.appendChild(verdict);
        reveal.appendChild(eps);

        function vote(v) {
          votes[item.id] = v;
          verdict.textContent = v ? "본다" : "안 본다";
          verdict.className = "verdict " + (v ? "y" : "n");
          card.classList.add("done");
          update();
          var next = card.nextElementSibling;
          if (next) next.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        yes.addEventListener("click", function () { vote(true); });
        no.addEventListener("click", function () { vote(false); });

        card.appendChild(head);
        card.appendChild(line);
        card.appendChild(cut);
        card.appendChild(choices);
        card.appendChild(reveal);
        frag.appendChild(card);
      });
      deck.appendChild(frag);
      deck.style.display = "flex";
      deck.style.flexDirection = "column";
      deck.style.gap = "1.25rem";
    }

    function update() {
      var ids = Object.keys(votes);
      var yes = ids.filter(function (k) { return votes[k]; }).length;
      var no = ids.length - yes;
      document.getElementById("t-done").textContent = ids.length;
      document.getElementById("t-yes").textContent = yes;
      document.getElementById("t-no").textContent = no;
      document.getElementById("t-bar").style.width =
        (ids.length / order.length * 100) + "%";

      if (ids.length !== order.length) { result.classList.remove("on"); return; }

      var pct = Math.round(yes / order.length * 100);
      document.getElementById("r-pct").textContent = pct;
      document.getElementById("r-frac").textContent = yes + " / " + order.length;
      document.getElementById("r-note").textContent = pct >= 70
        ? "컷 지점이 대체로 제 역할을 하고 있습니다. 아래 목록만 손보면 됩니다."
        : pct >= 50
          ? "절반 남짓입니다. 아래 컷 라인들은 비밀이 이미 공개됐거나, 다음 화에 무슨 일이 일어날지 예고가 없는 경우입니다."
          : "컷 지점 자체를 다시 잡아야 합니다. 무료 마지막 화를 한 화 앞이나 뒤로 옮기는 것부터 시도하세요.";

      var ul = document.getElementById("r-fails");
      ul.textContent = "";
      var failed = ALL.filter(function (x) { return votes[x.id] === false; });
      if (!failed.length) {
        var li = document.createElement("li");
        li.textContent = "없습니다. 60개 전부 통과했습니다.";
        ul.appendChild(li);
      } else {
        failed.forEach(function (x) {
          var li = document.createElement("li");
          var id = document.createElement("span");
          id.className = "id";
          id.textContent = x.id;
          var t = document.createElement("span");
          t.textContent = x.title;
          var g = document.createElement("span");
          g.className = "eps";
          g.textContent = "무료 " + x.free + "화";
          li.appendChild(id);
          li.appendChild(t);
          li.appendChild(g);
          ul.appendChild(li);
        });
      }
      result.classList.add("on");
      result.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    document.getElementById("shuffle").addEventListener("click", function () {
      votes = {}; shuffle(order); render(); update();
    });
    document.getElementById("reset").addEventListener("click", function () {
      votes = {}; render(); update();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    shuffle(order);
    render();
    update();
  })();
</script>
"""


def main() -> None:
    data = json.loads((ROOT / "data" / "series.json").read_text(encoding="utf-8"))
    items = [
        {
            "id": s["id"],
            "genre": s["genre"],
            "title": s["title"],
            "line": s["freeCutLine"],
            "total": s["totalEpisodes"],
            "free": s["freeEpisodes"],
        }
        for s in data["series"]
    ]
    html = HTML.replace("__DATA__", json.dumps(items, ensure_ascii=False))
    html = html.replace("__N__", str(len(items)))

    out = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "cutlines.html"
    out.write_text(html, encoding="utf-8")
    print(f"{out} 생성 완료: 컷 라인 {len(items)}개")


if __name__ == "__main__":
    main()
