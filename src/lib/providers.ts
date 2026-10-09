import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import type { ProviderId } from "./types";

/**
 * 모델 ID는 모두 환경변수로 바꿀 수 있다.
 * 기본값은 2026-10 기준 각 회사의 현재 모델/별칭이며, 제공사 문서에서 다시 확인하는 것이 좋다.
 */
export const DEFAULT_MODELS: Record<ProviderId, string> = {
  claude: process.env.ANTHROPIC_MODEL ?? "claude-opus-5-5",
  gemini: process.env.GOOGLE_MODEL ?? "gemini-flash-latest",
  chatgpt: process.env.OPENAI_MODEL ?? "gpt-5.5",
};

/** 세 답변을 비교하는 판정 모델. 답변 모델보다 저렴한 현재 세대 모델을 쓴다. */
export const JUDGE_MODEL = process.env.JUDGE_MODEL ?? "claude-sonnet-5-5";

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
export function getHelperModel(): { model: LanguageModel; id: string } | null {
  if (isConfigured("claude")) {
    return { model: getModel("claude", JUDGE_MODEL), id: JUDGE_MODEL };
  }
  const fallback = configuredProviders()[0];
  if (!fallback) return null;
  return { model: getModel(fallback), id: DEFAULT_MODELS[fallback] };
}

/** 답변 모델에만 넘기는 제공사별 옵션 */
export function answerProviderOptions(provider: ProviderId) {
  if (provider === "claude") {
    // 아이용 짧은 답변이라 과한 추론은 필요 없다. effort는 Opus 5.5의 주된 비용/지연 조절 수단이다.
    return { anthropic: { effort: "medium" as const } };
  }
  return undefined;
}
