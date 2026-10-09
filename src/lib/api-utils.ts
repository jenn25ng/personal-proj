import { NoProviderError } from "./ai";
import { getActiveChild } from "./auth";
import type { Child } from "@/db/schema";

export const MAX_QUESTION_LEN = 300;
export const MAX_FIELD_LEN = 600;

export function clean(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

export function errorResponse(err: unknown): Response {
  if (err instanceof NoProviderError) {
    return Response.json({ error: err.message }, { status: 503 });
  }
  console.error(err);
  return Response.json({ error: "AI 호출 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요." }, { status: 502 });
}

/** 모든 아이용 API는 로그인한 부모의 아동 프로필이 선택된 상태에서만 동작한다. */
export async function requireChild(): Promise<{ child: Child } | { response: Response }> {
  const active = await getActiveChild();
  if (!active) {
    return {
      response: Response.json({ error: "부모님 로그인과 아이 프로필 선택이 필요해요.", code: "NO_CHILD" }, { status: 401 }),
    };
  }
  return { child: active.child };
}
