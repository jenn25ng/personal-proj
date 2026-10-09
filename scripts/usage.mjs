// 사용량·비용 리포트. 실행: pnpm usage [days]
// .env.local의 ADMIN_TOKEN과 APP_URL(없으면 http://localhost:3000)을 쓴다.
const days = Number(process.argv[2] ?? 30);
const base = process.env.APP_URL ?? "http://localhost:3000";
const token = process.env.ADMIN_TOKEN;
if (!token) {
  console.error("ADMIN_TOKEN이 없어요. .env.local에 ADMIN_TOKEN=... 을 넣어 주세요.");
  process.exit(1);
}
const res = await fetch(`${base}/api/admin/usage?days=${days}`, { headers: { Authorization: `Bearer ${token}` } });
if (!res.ok) {
  console.error(`요청 실패 (${res.status}):`, await res.text());
  process.exit(1);
}
const r = await res.json();
const usd = (n) => (n == null ? "-" : `$${n.toFixed(4)}`);
console.log(`\n최근 ${r.days}일 (${r.since.slice(0, 10)} ~ ${r.until.slice(0, 10)})`);
console.log(`호출 ${r.totals.calls}회 · 오류 ${r.totals.errors}회 · 입력 ${r.totals.inputTokens.toLocaleString()} · 출력 ${r.totals.outputTokens.toLocaleString()} (사고 ${r.totals.reasoningTokens.toLocaleString()}) · 추정 ${usd(r.totals.usd)}`);
if (r.totals.unpriced) console.log(`요금 미등록 호출 ${r.totals.unpriced}회 (src/lib/pricing.ts에 모델을 추가하세요)`);
console.log(`질문 ${r.perQuestion.questions}건 → 건당 ${usd(r.perQuestion.usd)} · 게임 ${r.perGame.games}판 → 판당 ${usd(r.perGame.usd)}\n`);
console.table(
  r.byPurposeModel.map((a) => ({
    용도: a.purpose,
    제공사: a.provider,
    모델: a.model,
    호출: a.calls,
    오류: a.errors,
    입력: a.inputTokens,
    출력: a.outputTokens,
    사고: a.reasoningTokens,
    "평균ms": a.avgMs,
    "추정$": a.priced ? a.usd.toFixed(4) : "미등록",
    "호출당$": a.priced ? a.usdPerCall.toFixed(5) : "-",
  })),
);
console.table(r.byDay.map((d) => ({ 날짜: d.day, 호출: d.calls, "추정$": d.usd.toFixed(4) })));
