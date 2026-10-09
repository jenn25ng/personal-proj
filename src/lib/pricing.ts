/**
 * 1M 토큰당 달러. 비용 "추정"에만 쓴다. 제공사 요금이 바뀌면 여기만 고친다.
 * 모르는 모델은 null로 두고 리포트에 "요금 미등록"으로 표시한다.
 */
export type Price = { input: number; output: number; cacheRead?: number };

const PRICES: Record<string, Price> = {
  // MOCK_AI 모드. 비용 0으로 집계해 흐름만 확인한다.
  mock: { input: 0, output: 0 },
  // Anthropic (내부 레퍼런스, 2026-10)
  "claude-haiku-5-5": { input: 0.1, output: 0.5 },
  "claude-sonnet-5-5": { input: 2, output: 10, cacheRead: 0.2 },
  "claude-opus-5-5": { input: 4, output: 20, cacheRead: 0.2 },
  "claude-opus-5": { input: 5, output: 25 },
  "claude-haiku-4-5": { input: 1, output: 5 },
  // Google (외부 집계, 2026-10. 공식 문서로 확인 필요)
  "gemini-flash-latest": { input: 1.5, output: 9, cacheRead: 0.15 },
  "gemini-3.5-flash": { input: 1.5, output: 9, cacheRead: 0.15 },
  // OpenAI (외부 집계, 2026-10. 공식 문서로 확인 필요)
  "gpt-5.5": { input: 5, output: 30, cacheRead: 0.5 },
  "gpt-5.4-mini": { input: 0.75, output: 4.5 },
  "gpt-5.4-nano": { input: 0.2, output: 1.25 },
};

export function priceFor(model: string): Price | null {
  return PRICES[model] ?? null;
}

/** 사고 토큰은 출력 요금, 캐시 읽기는 캐시 요금(없으면 입력 요금)으로 계산한다. */
export function estimateUsd(
  model: string,
  u: { inputTokens: number; cacheReadTokens: number; outputTokens: number; reasoningTokens: number },
): number | null {
  const p = priceFor(model);
  if (!p) return null;
  const freshInput = Math.max(0, u.inputTokens - u.cacheReadTokens);
  const cacheRate = p.cacheRead ?? p.input;
  // 대부분의 제공사는 outputTokens에 사고 토큰이 이미 포함돼 있다. 포함되지 않은 경우를 대비해 더 큰 쪽을 쓴다.
  const output = Math.max(u.outputTokens, u.reasoningTokens);
  return (freshInput * p.input + u.cacheReadTokens * cacheRate + output * p.output) / 1_000_000;
}
