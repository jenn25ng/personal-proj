"use server";

import { redirect } from "next/navigation";
import { clearAdminCookie, setAdminCookie, tokenMatches } from "./admin";
import type { FormState } from "./actions";

export async function adminLogin(_prev: FormState, form: FormData): Promise<FormState> {
  const token = form.get("token");
  if (typeof token !== "string" || !tokenMatches(token.trim())) {
    return { error: "토큰이 맞지 않아요." };
  }
  await setAdminCookie(token.trim());
  redirect("/admin");
}

export async function adminLogout(): Promise<void> {
  await clearAdminCookie();
  redirect("/admin/login");
}
