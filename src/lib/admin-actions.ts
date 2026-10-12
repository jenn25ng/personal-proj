"use server";

import { redirect } from "next/navigation";
import { clearAdminCookie, setAdminCookie, tokenMatches } from "./admin";
import { checkRate, recordAttempt } from "./ratelimit";
import { isAdmin } from "./admin";
import { alertConfigured, reportError } from "./monitor";
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

/** 관리자 화면의 "테스트 오류 보내기": 기록과 웹훅 알림이 되는지 확인한다. */
export async function sendTestError(): Promise<FormState> {
  if (!(await isAdmin())) redirect("/admin/login");
  await reportError("test", new Error(`테스트 오류 (${new Date().toISOString()})`), { route: "admin" });
  return {
    ok: alertConfigured()
      ? "테스트 오류를 기록하고 웹훅으로 알림을 보냈어요. 같은 오류는 쿨다운 동안 다시 알리지 않아요."
      : "테스트 오류를 기록했어요. ALERT_WEBHOOK_URL 이 없어 알림은 보내지 않았어요.",
  };
}
