import { generateObject } from "ai";
import { z } from "zod";
import {
  DEFAULT_MODELS,
  MOCK_AI,
  answerProviderOptions,
  configuredProviders,
  getHelperModel,
  getModel,
} from "./providers";
import { ANSWER_SYSTEM, JUDGE_SYSTEM, REFLECT_SYSTEM, THINK_FIRST_SYSTEM } from "./prompts";
import { mockAnswer, mockReflect, mockThink } from "./mock";
import type { AnswerResult, JudgeResult, ModelAnswer, ProviderId, ReflectResult, ThinkFirstResult } from "./types";

export class NoProviderError extends Error {
  constructor() {
    super("AI 제공사 API 키가 하나도 설정되지 않았어요. .env.local을 확인하세요.");
  }
}

const thinkSchema = z.object({
  safe: z.boolean(),
  redirectMessage: z.string(),
  topicLabel: z.string(),
  guidingQuestion: z.string(),
  predictionPrompt: z.string(),
  hint: z.string(),
});

const answerSchema = z.object({
  answer: z.string(),
  selfConfidence: z.enum(["high", "medium", "low"]),
  uncertainParts: z.array(z.string()).max(3),
});

const judgeSchema = z.object({
  agreement: z.enum(["agree", "partly", "disagree"]),
  kidSummary: z.string(),
  differences: z.array(z.string()),
  riskyClaims: z.array(z.object({ claim: z.string(), why: z.string() })),
  checkTips: z.array(z.string()),
});

const reflectSchema = z.object({
  encouragement: z.string(),
  comparison: z.string(),
  verifyTip: z.string(),
  nextQuestion: z.string(),
});

/** 1단계: 생각 먼저 */
export async function thinkFirst(question: string): Promise<ThinkFirstResult> {
  if (MOCK_AI) return mockThink(question);
  const helper = getHelperModel();
  if (!helper) throw new NoProviderError();

  const { object } = await generateObject({
    model: helper.model,
    schema: thinkSchema,
    system: THINK_FIRST_SYSTEM,
    prompt: `어린이의 질문: """${question}"""`,
  });
  return object;
}

async function askOne(provider: ProviderId, question: string, prediction: string, priorKnowledge: string): Promise<ModelAnswer> {
  const model = DEFAULT_MODELS[provider];
  try {
    const { object } = await generateObject({
      model: getModel(provider),
      schema: answerSchema,
      system: ANSWER_SYSTEM,
      prompt: [
        `어린이의 질문: """${question}"""`,
        priorKnowledge ? `아이가 이미 알고 있다고 적은 것: """${priorKnowledge}"""` : "",
        prediction ? `아이의 예상: """${prediction}"""` : "",
      ]
        .filter(Boolean)
        .join("\n"),
      providerOptions: answerProviderOptions(provider),
    });
    return {
      provider,
      model,
      ok: true,
      text: object.answer,
      selfConfidence: object.selfConfidence,
      uncertainParts: object.uncertainParts,
    };
  } catch (err) {
    return {
      provider,
      model,
      ok: false,
      text: "",
      selfConfidence: "low",
      uncertainParts: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function judgeAnswers(question: string, answers: ModelAnswer[]): Promise<{ judge: JudgeResult; judgeModel: string } | null> {
  const helper = getHelperModel();
  const good = answers.filter((a) => a.ok);
  if (!helper || good.length === 0) return null;

  const { object } = await generateObject({
    model: helper.model,
    schema: judgeSchema,
    system: JUDGE_SYSTEM,
    prompt: [
      `어린이의 질문: """${question}"""`,
      ...good.map((a, i) => `[답변 ${i + 1}, ${a.provider}]\n${a.text}\n(스스로 밝힌 확신도: ${a.selfConfidence})`),
    ].join("\n\n"),
  });
  return { judge: object, judgeModel: helper.id };
}

/** 2단계: 세 모델에 동시에 묻고 비교 */
export async function askAll(question: string, prediction: string, priorKnowledge: string): Promise<AnswerResult> {
  if (MOCK_AI) return mockAnswer(question);
  const providers = configuredProviders();
  if (providers.length === 0) throw new NoProviderError();

  const answers = await Promise.all(providers.map((p) => askOne(p, question, prediction, priorKnowledge)));
  const judged = await judgeAnswers(question, answers);
  return { answers, judge: judged?.judge ?? null, judgeModel: judged?.judgeModel ?? null };
}

/** 3단계: 반성 */
export async function reflect(input: {
  question: string;
  prediction: string;
  answerSummary: string;
  reflection: string;
}): Promise<ReflectResult> {
  if (MOCK_AI) return mockReflect();
  const helper = getHelperModel();
  if (!helper) throw new NoProviderError();

  const { object } = await generateObject({
    model: helper.model,
    schema: reflectSchema,
    system: REFLECT_SYSTEM,
    prompt: [
      `어린이의 질문: """${input.question}"""`,
      `아이의 처음 예상: """${input.prediction || "(적지 않음)"}"""`,
      `AI 답변 요약: """${input.answerSummary}"""`,
      `아이가 적은 "알게 된 것": """${input.reflection || "(적지 않음)"}"""`,
    ].join("\n"),
  });
  return object;
}
