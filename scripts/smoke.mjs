// 실제 API 키로 전체 파이프라인을 한 번 돌려 본다. 실행: pnpm smoke
// .env.local 의 APP_URL(없으면 http://localhost:3000)과 ADMIN_TOKEN 을 쓴다.
const base = process.env.APP_URL ?? "http://localhost:3000";
const token = process.env.ADMIN_TOKEN;
if (!token) {
  console.error("ADMIN_TOKEN이 없어요. .env.local에 ADMIN_TOKEN=... 을 넣어 주세요.");
  process.exit(1);
}
console.log(`상태 확인: ${base}/api/health`);
const health = await (await fetch(`${base}/api/health`)).json();
console.log(`  db=${health.db.kind}(${health.db.status}) mail=${health.mail} mock=${health.ai.mock} providers=${Object.entries(health.ai.providers).filter(([, v]) => v).map(([k]) => k).join(",") || "없음"}`);
for (const p of health.problems) console.log(`  ! ${p}`);

console.log("\n파이프라인 실행 (모델 호출 7~8회, 1분 안팎)...");
const res = await fetch(`${base}/api/admin/smoke`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
if (!res.ok) {
  console.error(`실패 (${res.status}):`, await res.text());
  process.exit(1);
}
const r = await res.json();
for (const s of r.steps) {
  console.log(`${s.ok ? "✓" : "✗"} ${s.step} · ${s.ms}ms`);
  if (s.detail) console.log("   ", JSON.stringify(s.detail, null, 0).slice(0, 400));
  if (s.error) console.log("    오류:", s.error);
}
console.log(`\n호출 ${r.usage.calls}회 · 오류 ${r.usage.errors} · 입력 ${r.usage.input} · 출력 ${r.usage.output} (사고 ${r.usage.reasoning})`);
console.table(r.usage.byCall.map((u) => ({ 용도: u.purpose, 제공사: u.provider, 모델: u.model, 입력: u.input, 출력: u.output, ms: u.ms, 결과: u.ok ? "ok" : u.error })));
console.log(r.ok ? "\nSMOKE OK" : "\nSMOKE FAILED");
process.exit(r.ok ? 0 : 1);
