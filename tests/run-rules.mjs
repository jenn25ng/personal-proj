// 규칙 필터 테스트. 키 없이 돈다. 실행: pnpm test:rules
// 1) tests/testset/guardrail-cases.json 의 기대값과 비교 (known_gap 은 따로 센다)
// 2) tests/testset/real-child-messages.jsonl 의 실제 아이 메시지가 하나도 막히지 않는지 확인
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const { screenInput, screenOutput } = await import(path.join(here, "../src/lib/safety-rules.ts"));

const cases = JSON.parse(readFileSync(path.join(here, "testset/guardrail-cases.json"), "utf8"));
const real = readFileSync(path.join(here, "testset/real-child-messages.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
const gaps = new Set(cases.known_gap ?? []);

let fail = 0, gap = 0, gapFixed = 0;
function check(label, text, want, got, category) {
  const ok = want === got;
  const known = gaps.has(text);
  if (ok && known) { gapFixed++; console.log(`✓ (고쳐짐, known_gap 지워도 됨) ${label} ${text}`); }
  else if (!ok && known) gap++;
  else if (!ok) { fail++; console.log(`✗ ${label} 기대 ${want} 결과 ${got}${category ? ` [${category}]` : ""}  ${text}`); }
}
for (const [text, want] of cases.input) {
  const r = screenInput(text);
  check("입력", text, want, r.ok ? "pass" : "block", r.ok ? "" : r.category);
}
for (const [text, want] of cases.output) {
  const r = screenOutput([text]);
  check("출력", text, want, r.ok ? "pass" : "block", r.ok ? "" : r.category);
}
let realBlocked = 0;
for (const m of real) {
  const r = screenInput(m.text);
  if (!r.ok) { realBlocked++; fail++; console.log(`✗ 실제 아이 메시지가 막힘 ${m.id} [${r.category}] ${m.text.slice(0, 80)}`); }
}
console.log(`\n규칙 사례 ${cases.input.length + cases.output.length}건: 실패 ${fail - realBlocked}, 알려진 구멍 ${gap}${gapFixed ? `, 고쳐진 구멍 ${gapFixed}` : ""}`);
console.log(`실제 아이 메시지 ${real.length}건: 막힘 ${realBlocked}`);
process.exit(fail > 0 ? 1 : 0);
