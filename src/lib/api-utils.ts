import { NoProviderError } from "./ai";

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
