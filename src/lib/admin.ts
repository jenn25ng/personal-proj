import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const ADMIN_COOKIE = "tf_admin";

/** 쿠키에는 토큰 자체가 아니라 토큰의 해시를 넣는다. */
function cookieValueFor(token: string): string {
  return createHash("sha256").update(`admin-cookie:${token}`).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function adminConfigured(): boolean {
  return Boolean(process.env.ADMIN_TOKEN);
}

export function tokenMatches(token: string): boolean {
  const expected = process.env.ADMIN_TOKEN;
  return Boolean(expected) && safeEqual(token, expected!);
}

export async function setAdminCookie(token: string) {
  (await cookies()).set(ADMIN_COOKIE, cookieValueFor(token), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/admin",
    maxAge: 12 * 60 * 60,
  });
}

export async function clearAdminCookie() {
  (await cookies()).delete({ name: ADMIN_COOKIE, path: "/admin" });
}

/** 관리자 화면용: 쿠키 검사 */
export async function isAdmin(): Promise<boolean> {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) return false;
  const value = (await cookies()).get(ADMIN_COOKIE)?.value;
  return Boolean(value) && safeEqual(value!, cookieValueFor(expected));
}

export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) redirect("/admin/login");
}

/** API용: Bearer 토큰 또는 관리자 쿠키 */
export async function isAdminRequest(request: Request): Promise<boolean> {
  const auth = request.headers.get("authorization") ?? "";
  if (auth.startsWith("Bearer ") && tokenMatches(auth.slice(7))) return true;
  return isAdmin();
}
