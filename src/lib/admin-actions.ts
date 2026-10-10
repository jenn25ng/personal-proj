"use server";

import { redirect } from "next/navigation";
import { clearAdminCookie, setAdminCookie, tokenMatches } from "./admin";
import { checkRate, recordAttempt } from "./ratelimit";
import type { FormState } from "./actions";

export async function adminLogin(_prev: FormState, form: FormData): Promise<FormState> {
  const rate = await checkRate("admin");
  if (!rate.allowed) return { error: rate.message };
  const token = form.get("token");
  const ok = typeof token === "string" && tokenMatches(token.trim());
  await recordAttempt("admin", ok);
  if (!ok || typeof token !== "string") return { error: "토큰이 맞지 않아요." };
  await setAdminCookie(token.trim());
  redirect("/admin");
}

export async function adminLogout(): Promise<void> {
  await clearAdminCookie();
  redirect("/admin/login");
}
