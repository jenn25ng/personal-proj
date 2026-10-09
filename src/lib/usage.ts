import "server-only";
import type { LanguageModelUsage } from "ai";
import { getDb, schema } from "@/db";

export type UsagePurpose = "think" | "answer" | "judge" | "reflect" | "game";

/** 호출을 묶고 아이를 식별하는 문맥. 라우트에서 만들어 ai.ts로 넘긴다. */
export type CallContext = { requestId: string; childId?: string };

export function newContext(childId?: string): CallContext {
  return { requestId: crypto.randomUUID(), childId };
}

type Row = {
  ctx: CallContext;
  purpose: UsagePurpose;
  provider: string;
  model: string;
  usage?: LanguageModelUsage;
  durationMs: number;
  error?: unknown;
};

/** 사용량 한 줄 기록. 기록 실패가 서비스 응답을 막으면 안 되므로 오류는 삼킨다. */
export async function recordUsage(row: Row): Promise<void> {
  try {
    const db = await getDb();
    const u = row.usage;
    await db.insert(schema.aiUsage).values({
      requestId: row.ctx.requestId,
      childId: row.ctx.childId ?? null,
      purpose: row.purpose,
      provider: row.provider,
      model: row.model,
      inputTokens: u?.inputTokens ?? 0,
      cacheReadTokens: u?.inputTokenDetails?.cacheReadTokens ?? 0,
      outputTokens: u?.outputTokens ?? 0,
      reasoningTokens: u?.outputTokenDetails?.reasoningTokens ?? 0,
      durationMs: Math.round(row.durationMs),
      ok: row.error == null,
      error: row.error == null ? null : String(row.error instanceof Error ? row.error.message : row.error).slice(0, 500),
    });
  } catch (err) {
    console.error("[usage] 기록 실패", err);
  }
}

/** generateObject 같은 호출을 감싸 시간과 사용량을 기록한다. */
export async function tracked<T extends { usage: LanguageModelUsage }>(
  meta: Omit<Row, "usage" | "durationMs" | "error">,
  fn: () => Promise<T>,
): Promise<T> {
  const started = performance.now();
  try {
    const result = await fn();
    await recordUsage({ ...meta, usage: result.usage, durationMs: performance.now() - started });
    return result;
  } catch (error) {
    await recordUsage({ ...meta, durationMs: performance.now() - started, error });
    throw error;
  }
}

/** MOCK_AI 모드용: 글자 수로 어림한 사용량을 남겨 호출 횟수와 흐름을 확인할 수 있게 한다. */
export async function recordMock(ctx: CallContext, purpose: UsagePurpose, promptChars: number, resultChars: number) {
  const usage = {
    inputTokens: Math.round(promptChars / 2),
    inputTokenDetails: { noCacheTokens: undefined, cacheReadTokens: 0, cacheWriteTokens: undefined },
    outputTokens: Math.round(resultChars / 2),
    outputTokenDetails: { textTokens: undefined, reasoningTokens: 0 },
    totalTokens: undefined,
    raw: undefined,
  } as unknown as LanguageModelUsage;
  await recordUsage({ ctx, purpose, provider: "mock", model: "mock", usage, durationMs: 0 });
}
