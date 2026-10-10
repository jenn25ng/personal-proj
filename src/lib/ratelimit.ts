import "server-only";
import { and, count, eq, gte, lt } from "drizzle-orm";
import { headers } from "next/headers";
import { getDb, schema } from "@/db";

export type AttemptKind = "login" | "signup" | "reset" | "resend" | "admin";

type Rule = { limit: number; windowMs: number; failuresOnly: boolean };

/** 기준별 규칙. 실패만 세는 것(로그인)과 시도 전체를 세는 것(가입·재설정)이 다르다. */
const RULES: Record<AttemptKind, { email?: Rule; ip?: Rule; parent?: Rule }> = {
  login: {
    email: { limit: 5, windowMs: 15 * 60_000, failuresOnly: true },
    ip: { limit: 30, windowMs: 15 * 60_000, failuresOnly: true },
  },
  signup: { ip: { limit: 5, windowMs: 60 * 60_000, failuresOnly: false } },
  reset: {
    email: { limit: 3, windowMs: 60 * 60_000, failuresOnly: false },
    ip: { limit: 10, windowMs: 60 * 60_000, failuresOnly: false },
  },
  resend: { parent: { limit: 5, windowMs: 60 * 60_000, failuresOnly: false } },
  admin: { ip: { limit: 5, windowMs: 15 * 60_000, failuresOnly: true } },
};

/** 프록시 뒤에서도 쓸 수 있게 x-forwarded-for 를 먼저 본다. 없으면 "unknown" 으로 묶인다. */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  const ip = (fwd ? fwd.split(",")[0] : h.get("x-real-ip")) ?? "unknown";
  return ip.trim().slice(0, 64) || "unknown";
}

export type RateCheck = { allowed: true } | { allowed: false; retryAfterMin: number; message: string };

async function countRecent(key: string, kind: AttemptKind, rule: Rule): Promise<number> {
  const db = await getDb();
  const since = new Date(Date.now() - rule.windowMs);
  const where = rule.failuresOnly
    ? and(eq(schema.authAttempts.key, key), eq(schema.authAttempts.kind, kind), eq(schema.authAttempts.success, false), gte(schema.authAttempts.createdAt, since))
    : and(eq(schema.authAttempts.key, key), eq(schema.authAttempts.kind, kind), gte(schema.authAttempts.createdAt, since));
  const [row] = await db.select({ n: count() }).from(schema.authAttempts).where(where);
  return Number(row?.n ?? 0);
}

/**
 * 시도 전에 호출한다. 어느 기준이든 한도를 넘으면 막는다.
 * subject: email(소문자) / parentId. ip는 자동으로 읽는다.
 */
export async function checkRate(kind: AttemptKind, subject?: { email?: string; parentId?: string }): Promise<RateCheck> {
  const rules = RULES[kind];
  const checks: { key: string; rule: Rule }[] = [];
  if (rules.email && subject?.email) checks.push({ key: `email:${subject.email}`, rule: rules.email });
  if (rules.parent && subject?.parentId) checks.push({ key: `parent:${subject.parentId}`, rule: rules.parent });
  if (rules.ip) checks.push({ key: `ip:${await clientIp()}`, rule: rules.ip });

  for (const { key, rule } of checks) {
    const n = await countRecent(key, kind, rule);
    if (n >= rule.limit) {
      const retryAfterMin = Math.max(1, Math.ceil(rule.windowMs / 60_000));
      return {
        allowed: false,
        retryAfterMin,
        message: `너무 여러 번 시도했어요. ${retryAfterMin}분쯤 뒤에 다시 해 주세요.`,
      };
    }
  }
  return { allowed: true };
}

/** 시도 결과를 남긴다. 성공도 남겨서 전체 횟수 기준 규칙에 쓴다. */
export async function recordAttempt(kind: AttemptKind, success: boolean, subject?: { email?: string; parentId?: string }): Promise<void> {
  try {
    const db = await getDb();
    const keys: string[] = [`ip:${await clientIp()}`];
    if (subject?.email) keys.push(`email:${subject.email}`);
    if (subject?.parentId) keys.push(`parent:${subject.parentId}`);
    await db.insert(schema.authAttempts).values(keys.map((key) => ({ key, kind, success })));
    // 가끔 오래된 기록을 지운다 (24시간 지난 것).
    if (Math.random() < 0.05) {
      await db.delete(schema.authAttempts).where(lt(schema.authAttempts.createdAt, new Date(Date.now() - 24 * 60 * 60_000)));
    }
  } catch (err) {
    console.error("[ratelimit] 기록 실패", err);
  }
}
