import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { headers } from "next/headers";
import { getDb, schema } from "@/db";

export type TokenPurpose = "verify" | "reset";

const TTL_MS: Record<TokenPurpose, number> = {
  verify: 24 * 60 * 60 * 1000,
  reset: 60 * 60 * 1000,
};

/** 같은 용도의 메일을 이 간격 안에 다시 보내지 않는다. */
export const RESEND_COOLDOWN_MS = 60 * 1000;

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** 새 토큰을 만들고 해시만 저장한다. 같은 용도의 이전 토큰은 모두 무효화한다. */
export async function issueToken(parentId: string, purpose: TokenPurpose): Promise<string> {
  const db = await getDb();
  const token = randomBytes(32).toString("base64url");
  await db
    .delete(schema.emailTokens)
    .where(and(eq(schema.emailTokens.parentId, parentId), eq(schema.emailTokens.purpose, purpose)));
  await db.insert(schema.emailTokens).values({
    tokenHash: hashToken(token),
    parentId,
    purpose,
    expiresAt: new Date(Date.now() + TTL_MS[purpose]),
  });
  return token;
}

/** 최근에 같은 용도의 토큰을 발급했는지 (재전송 제한용) */
export async function issuedRecently(parentId: string, purpose: TokenPurpose): Promise<boolean> {
  const db = await getDb();
  const last = await db.query.emailTokens.findFirst({
    where: and(eq(schema.emailTokens.parentId, parentId), eq(schema.emailTokens.purpose, purpose)),
    orderBy: [desc(schema.emailTokens.createdAt)],
  });
  return Boolean(last && Date.now() - last.createdAt.getTime() < RESEND_COOLDOWN_MS);
}

/** 유효한(만료 전, 미사용) 토큰이면 parentId를 돌려준다. 소비하지는 않는다. */
export async function peekToken(token: string, purpose: TokenPurpose): Promise<string | null> {
  if (!token || token.length > 200) return null;
  const db = await getDb();
  const row = await db.query.emailTokens.findFirst({
    where: and(
      eq(schema.emailTokens.tokenHash, hashToken(token)),
      eq(schema.emailTokens.purpose, purpose),
      isNull(schema.emailTokens.usedAt),
      gt(schema.emailTokens.expiresAt, new Date()),
    ),
  });
  return row?.parentId ?? null;
}

/** 토큰을 사용 처리한다. 성공하면 parentId. */
export async function consumeToken(token: string, purpose: TokenPurpose): Promise<string | null> {
  const parentId = await peekToken(token, purpose);
  if (!parentId) return null;
  const db = await getDb();
  await db
    .update(schema.emailTokens)
    .set({ usedAt: new Date() })
    .where(eq(schema.emailTokens.tokenHash, hashToken(token)));
  return parentId;
}

/** 메일에 넣을 절대 URL. APP_URL이 없으면 요청 헤더에서 만든다. */
export async function appUrl(path: string): Promise<string> {
  const base = process.env.APP_URL;
  if (base) return new URL(path, base).toString();
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}${path}`;
}
