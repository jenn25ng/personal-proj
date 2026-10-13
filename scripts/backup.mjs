// 앱에서 전체 데이터를 JSON으로 받아 backups/ 에 저장한다. 실행: pnpm backup
// .env.local 의 APP_URL(없으면 http://localhost:3000)과 ADMIN_TOKEN 을 쓴다.
import { mkdirSync, writeFileSync, readdirSync, statSync, unlinkSync } from "node:fs";
import { gzipSync } from "node:zlib";
import path from "node:path";

const base = process.env.APP_URL ?? "http://localhost:3000";
const token = process.env.ADMIN_TOKEN;
const dir = process.env.BACKUP_DIR ?? "backups";
const keepDays = Number(process.env.BACKUP_KEEP_DAYS ?? 30);
if (!token) {
  console.error("ADMIN_TOKEN이 없어요. .env.local에 ADMIN_TOKEN=... 을 넣어 주세요.");
  process.exit(1);
}
const res = await fetch(`${base}/api/admin/backup`, { headers: { Authorization: `Bearer ${token}` } });
if (!res.ok) {
  console.error(`백업 실패 (${res.status}):`, await res.text());
  process.exit(1);
}
const json = await res.text();
const data = JSON.parse(json);
mkdirSync(dir, { recursive: true });
const file = path.join(dir, `think-first-backup-${data.exportedAt.replace(/[:.]/g, "-")}.json.gz`);
writeFileSync(file, gzipSync(json));
console.log(`저장: ${file}`);
console.log("테이블별 행 수:", Object.entries(data.counts).map(([k, v]) => `${k} ${v}`).join(", "));

// 오래된 백업 정리
const cutoff = Date.now() - keepDays * 24 * 60 * 60 * 1000;
for (const f of readdirSync(dir)) {
  const p = path.join(dir, f);
  if (f.startsWith("think-first-backup-") && statSync(p).mtimeMs < cutoff) {
    unlinkSync(p);
    console.log(`삭제(보관 기간 지남): ${f}`);
  }
}
