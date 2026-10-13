// JSON 백업을 PostgreSQL에 복원한다. 실행: DATABASE_URL=postgres://... node scripts/restore.mjs backups/파일.json.gz
// 먼저 `pnpm db:migrate` 로 빈 DB에 스키마를 만든 뒤 실행한다. 이미 있는 행(같은 기본키)은 건너뛴다.
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import pg from "pg";

const file = process.argv[2];
const url = process.env.DATABASE_URL;
if (!file || !url) {
  console.error("사용법: DATABASE_URL=postgres://... node scripts/restore.mjs <백업파일.json[.gz]>");
  process.exit(1);
}
const raw = readFileSync(file);
const text = file.endsWith(".gz") ? gunzipSync(raw).toString("utf8") : raw.toString("utf8");
const data = JSON.parse(text);
if (data.format !== "think-first-backup") {
  console.error("이 서비스의 백업 파일이 아니에요.");
  process.exit(1);
}

// 부모 → 자식 순서 (백업 파일의 순서를 그대로 믿지 않는다)
const ORDER = ["parents", "auth_sessions", "auth_attempts", "email_tokens", "children", "daily_bonuses", "question_logs", "game_results", "ai_usage", "safety_events", "error_events"];
const PK = { auth_sessions: "token", email_tokens: "token_hash" };

const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  await client.query("begin");
  for (const table of ORDER) {
    const rows = data.tables[table] ?? [];
    let inserted = 0;
    for (const row of rows) {
      const cols = Object.keys(row);
      const vals = cols.map((c) => {
        const v = row[c];
        return v !== null && typeof v === "object" && !(v instanceof Date) ? JSON.stringify(v) : v;
      });
      const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
      const pk = PK[table] ?? "id";
      const r = await client.query(
        `insert into "${table}" (${cols.map((c) => `"${c}"`).join(", ")}) values (${placeholders}) on conflict ("${pk}") do nothing`,
        vals,
      );
      inserted += r.rowCount ?? 0;
    }
    console.log(`${table}: ${inserted}/${rows.length} 복원`);
  }
  await client.query("commit");
  console.log(`복원 완료 (백업 시각 ${data.exportedAt})`);
} catch (err) {
  await client.query("rollback");
  console.error("복원 실패, 되돌렸어요:", err.message);
  process.exit(1);
} finally {
  await client.end();
}
