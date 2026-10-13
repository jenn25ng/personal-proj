import "server-only";
import { sql } from "drizzle-orm";
import { getDb } from "@/db";

/** 내보내는 테이블. 복원 때 외래키 순서를 지키도록 부모 → 자식 순으로 둔다. */
export const BACKUP_TABLES = [
  "parents",
  "auth_sessions",
  "auth_attempts",
  "email_tokens",
  "children",
  "daily_bonuses",
  "question_logs",
  "game_results",
  "ai_usage",
  "safety_events",
  "error_events",
] as const;

export type BackupFile = {
  format: "think-first-backup";
  version: 1;
  exportedAt: string;
  tables: Record<string, Record<string, unknown>[]>;
  counts: Record<string, number>;
};

/** 모든 테이블을 DB 컬럼 이름 그대로(snake_case) 내보낸다. 복원 스크립트가 그대로 INSERT 한다. */
export async function exportAll(): Promise<BackupFile> {
  const db = await getDb();
  const tables: BackupFile["tables"] = {};
  const counts: BackupFile["counts"] = {};
  for (const name of BACKUP_TABLES) {
    const result = await db.execute(sql.raw(`select * from "${name}" order by 1`));
    const rows = (Array.isArray(result) ? result : (result as { rows?: unknown[] }).rows ?? []) as Record<string, unknown>[];
    tables[name] = rows;
    counts[name] = rows.length;
  }
  return { format: "think-first-backup", version: 1, exportedAt: new Date().toISOString(), tables, counts };
}
