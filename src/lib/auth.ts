import "server-only";
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getDb, schema } from "@/db";
import type { Child, Parent } from "@/db/schema";

const scrypt = promisify(scryptCb);

export const SESSION_COOKIE = "tf_session";
export const CHILD_COOKIE = "tf_child";
const SESSION_DAYS = 30;

/** 법정대리인 동의 문구가 바뀌면 버전을 올린다. 기존 동의는 그대로 남는다. */
export const CONSENT_VERSION = "2026-10-v1";

// ---------- 비밀번호 ----------

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const key = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt$${salt}$${key.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algo, salt, hex] = stored.split("$");
  if (algo !== "scrypt" || !salt || !hex) return false;
  const key = (await scrypt(password, salt, 64)) as Buffer;
  const expected = Buffer.from(hex, "hex");
  return key.length === expected.length && timingSafeEqual(key, expected);
}

// ---------- 세션 ----------

const cookieBase = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

export async function createAuthSession(parentId: string) {
  const db = await getDb();
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(schema.authSessions).values({ token, parentId, expiresAt });
  (await cookies()).set(SESSION_COOKIE, token, { ...cookieBase, expires: expiresAt });
}

export async function destroyAuthSession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    const db = await getDb();
    await db.delete(schema.authSessions).where(eq(schema.authSessions.token, token));
  }
  store.delete(SESSION_COOKIE);
  store.delete(CHILD_COOKIE);
}

/** 로그인한 부모. 없으면 null. */
export async function getParent(): Promise<Parent | null> {
  // 세션 만료 비교에 현재 시각을 쓰므로, 프리렌더가 아니라 요청 시점에만 실행되게 한다.
  await connection();
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const db = await getDb();
  const rows = await db
    .select({ parent: schema.parents })
    .from(schema.authSessions)
    .innerJoin(schema.parents, eq(schema.authSessions.parentId, schema.parents.id))
    .where(and(eq(schema.authSessions.token, token), gt(schema.authSessions.expiresAt, new Date())))
    .limit(1);
  return rows[0]?.parent ?? null;
}

// ---------- 아동 프로필 ----------

export async function setActiveChild(childId: string) {
  (await cookies()).set(CHILD_COOKIE, childId, {
    ...cookieBase,
    expires: new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000),
  });
}

/** 현재 기기에서 선택된 아동. 반드시 로그인한 부모의 아이여야 한다. */
export async function getActiveChild(): Promise<{ parent: Parent; child: Child } | null> {
  const parent = await getParent();
  if (!parent) return null;
  const childId = (await cookies()).get(CHILD_COOKIE)?.value;
  if (!childId || !/^[0-9a-f-]{36}$/.test(childId)) return null;
  const db = await getDb();
  const child = await db.query.children.findFirst({
    where: and(eq(schema.children.id, childId), eq(schema.children.parentId, parent.id)),
  });
  return child ? { parent, child } : null;
}

export async function listChildren(parentId: string): Promise<Child[]> {
  const db = await getDb();
  return db.query.children.findMany({
    where: eq(schema.children.parentId, parentId),
    orderBy: (c, { asc }) => [asc(c.createdAt)],
  });
}

// ---------- 페이지 가드 (서버 컴포넌트에서 사용) ----------

/** 로그인한 부모가 없으면 /login으로 보낸다. */
export async function requireParent(): Promise<Parent> {
  const parent = await getParent();
  if (!parent) redirect("/login");
  return parent;
}

/** 선택된 아동이 없으면 로그인 또는 프로필 선택 화면으로 보낸다. */
export async function requireActiveChild(): Promise<{ parent: Parent; child: Child }> {
  const parent = await getParent();
  if (!parent) redirect("/login");
  const active = await getActiveChild();
  if (!active) redirect("/parent?pick=1");
  return active;
}
