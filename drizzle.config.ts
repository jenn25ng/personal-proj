import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  // `pnpm db:migrate` 는 DATABASE_URL 의 PostgreSQL에 drizzle/ 의 SQL을 적용한다. (앱 시작 시에도 자동 적용된다)
  dbCredentials: { url: process.env.DATABASE_URL ?? "postgres://localhost:5432/think_first" },
});
