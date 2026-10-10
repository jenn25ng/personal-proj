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
export function dbKind(): "postgres" | "pglite" {
  return process.env.DATABASE_URL ? "postgres" : "pglite";
}

async function connect(): Promise<Db> {
  const url = process.env.DATABASE_URL;
  // 운영에서 PGlite는 컨테이너·서버리스 재시작 때 데이터가 사라질 수 있다. 명시적으로 허용할 때만 쓴다.
  if (!url && process.env.NODE_ENV === "production" && process.env.ALLOW_PGLITE_IN_PRODUCTION !== "1") {
    throw new Error(
      "운영 모드에서는 DATABASE_URL(PostgreSQL)이 필요해요. 단일 서버에서 파일 DB를 그대로 쓰려면 ALLOW_PGLITE_IN_PRODUCTION=1 을 설정하세요.",
    );
  }
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
