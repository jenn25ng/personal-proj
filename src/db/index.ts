import "server-only";
import path from "node:path";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

const MIGRATIONS = path.join(process.cwd(), "drizzle");
const PGLITE_DIR = process.env.PGLITE_DIR ?? path.join(process.cwd(), ".data", "pglite");

/**
 * DATABASE_URL이 있으면 PostgreSQL(node-postgres), 없으면 파일 기반 PGlite를 쓴다.
 * 스키마는 같은 pg 스키마 하나이고, 시작 시 drizzle/ 폴더의 마이그레이션을 적용한다.
 */
async function connect(): Promise<Db> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const { migrate } = await import("drizzle-orm/node-postgres/migrator");
    const { Pool } = await import("pg");
    const db = drizzle({ client: new Pool({ connectionString: url }), schema });
    await migrate(db, { migrationsFolder: MIGRATIONS });
    return db;
  }
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const db = drizzle({ connection: { dataDir: PGLITE_DIR }, schema });
  await migrate(db, { migrationsFolder: MIGRATIONS });
  return db;
}

// 개발 중 HMR로 모듈이 다시 평가돼도 연결을 하나만 유지한다.
const g = globalThis as unknown as { __thinkFirstDb?: Promise<Db> };

export function getDb(): Promise<Db> {
  if (!g.__thinkFirstDb) {
    g.__thinkFirstDb = connect().catch((err) => {
      g.__thinkFirstDb = undefined;
      throw err;
    });
  }
  return g.__thinkFirstDb;
}

export { schema };
