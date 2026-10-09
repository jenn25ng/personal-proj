import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import type { ProviderId } from "./types";

/**
 * 모델 ID는 모두 환경변수로 바꿀 수 있다.
 * 기본값은 비용을 최우선으로 각 회사의 가장 가벼운 현재 모델이다 (2026-10 기준, 제공사 문서에서 다시 확인할 것).
 * 품질을 올리고 싶으면 .env.local에서 ANTHROPIC_MODEL=claude-sonnet-5-5, OPENAI_MODEL=gpt-5.5 처럼 바꾼다.
 */
export const DEFAULT_MODELS: Record<ProviderId, string> = {
  claude: process.env.ANTHROPIC_MODEL ?? "claude-haiku-5-5",
  gemini: process.env.GOOGLE_MODEL ?? "gemini-flash-latest",
  chatgpt: process.env.OPENAI_MODEL ?? "gpt-5.4-nano",
};

/** 생각 단계·비교 판정·반성·게임 문제를 만드는 모델. 가장 가벼운 현재 세대 Claude. */
export const JUDGE_MODEL = process.env.JUDGE_MODEL ?? "claude-haiku-5-5";

export const MOCK_AI = process.env.MOCK_AI === "1";

const ENV_KEY: Record<ProviderId, string> = {
  claude: "ANTHROPIC_API_KEY",
  gemini: "GOOGLE_GENERATIVE_AI_API_KEY",
  chatgpt: "OPENAI_API_KEY",
};

export function isConfigured(provider: ProviderId): boolean {
  return Boolean(process.env[ENV_KEY[provider]]);
}

export function configuredProviders(): ProviderId[] {
  return (["claude", "gemini", "chatgpt"] as ProviderId[]).filter(isConfigured);
}

export function getModel(provider: ProviderId, modelId = DEFAULT_MODELS[provider]): LanguageModel {
  switch (provider) {
    case "claude":
      return createAnthropic()(modelId);
    case "gemini":
      return createGoogleGenerativeAI()(modelId);
    case "chatgpt":
      return createOpenAI()(modelId);
  }
}

/**
 * 생각 단계, 판정, 반성처럼 "진행을 돕는" 호출에 쓰는 모델.
 * 기본은 Claude이고, 키가 없으면 설정된 다른 제공사로 대체한다.
 */
export function getHelperModel(): { model: LanguageModel; id: string; provider: ProviderId } | null {
  if (isConfigured("claude")) {
    return { model: getModel("claude", JUDGE_MODEL), id: JUDGE_MODEL, provider: "claude" };
  }
  const fallback = configuredProviders()[0];
  if (!fallback) return null;
  return { model: getModel(fallback), id: DEFAULT_MODELS[fallback], provider: fallback };
}

/** 답변 모델에만 넘기는 제공사별 옵션 */
export function answerProviderOptions(provider: ProviderId) {
  if (provider === "claude") {
    // 아이용 짧은 답변이라 추론은 최소로. effort는 사고 토큰(출력 요금)을 줄이는 주된 수단이다.
    return { anthropic: { effort: "low" as const } };
  }
  return undefined;
}
