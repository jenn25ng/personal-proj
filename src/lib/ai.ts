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
import { ANSWER_SYSTEM, GAME_SYSTEM, JUDGE_SYSTEM, REFLECT_SYSTEM, THINK_FIRST_SYSTEM } from "./prompts";
import { mockAnswer, mockGame, mockReflect, mockThink } from "./mock";
import { newContext, recordMock, tracked, type CallContext } from "./usage";
import type {
  AnswerResult,
  GamePuzzle,
  JudgeResult,
  ModelAnswer,
  ProviderId,
  QuestionMode,
  ReflectResult,
  ThinkFirstResult,
} from "./types";

export class NoProviderError extends Error {
  constructor() {
    super("AI 제공사 API 키가 하나도 설정되지 않았어요. .env.local을 확인하세요.");
  }
}

const thinkSchema = z.object({
  safe: z.boolean(),
  redirectMessage: z.string(),
  topicLabel: z.string(),
  mode: z.enum(["think", "direct"]),
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
  followUps: z.array(z.string()).max(3),
  puzzles: z.array(z.object({ question: z.string(), hint: z.string(), solution: z.string() })).max(2),
});

const reflectSchema = z.object({
  encouragement: z.string(),
  comparison: z.string(),
  verifyTip: z.string(),
  nextQuestion: z.string(),
});

/** 1단계: 생각 먼저 */
export async function thinkFirst(question: string, ctx: CallContext = newContext()): Promise<ThinkFirstResult> {
  if (MOCK_AI) {
    const r = mockThink(question);
    await recordMock(ctx, "think", THINK_FIRST_SYSTEM.length + question.length, JSON.stringify(r).length);
    return r;
  }
  const helper = getHelperModel();
  if (!helper) throw new NoProviderError();

  const { object } = await tracked({ ctx, purpose: "think", provider: helper.provider, model: helper.id }, () =>
    generateObject({
      model: helper.model,
      schema: thinkSchema,
      system: THINK_FIRST_SYSTEM,
      prompt: `어린이의 질문: """${question}"""`,
    }),
  );
  return object;
}

async function askOne(
  provider: ProviderId,
  question: string,
  prediction: string,
  priorKnowledge: string,
  ctx: CallContext,
): Promise<ModelAnswer> {
  const model = DEFAULT_MODELS[provider];
  try {
    const { object } = await tracked({ ctx, purpose: "answer", provider, model }, () =>
      generateObject({
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
      }),
    );
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

async function judgeAnswers(
  question: string,
  mode: QuestionMode,
  answers: ModelAnswer[],
  ctx: CallContext,
): Promise<{ judge: JudgeResult; judgeModel: string } | null> {
  const helper = getHelperModel();
  const good = answers.filter((a) => a.ok);
  if (!helper || good.length === 0) return null;

  const { object } = await tracked({ ctx, purpose: "judge", provider: helper.provider, model: helper.id }, () =>
    generateObject({
      model: helper.model,
      schema: judgeSchema,
      system: JUDGE_SYSTEM,
      prompt: [
        `어린이의 질문: """${question}"""`,
        `질문 종류: ${mode === "direct" ? "바로 답한 질문(단순 사실)" : "생각 먼저 질문"}`,
        ...good.map((a, i) => `[답변 ${i + 1}, ${a.provider}]\n${a.text}\n(스스로 밝힌 확신도: ${a.selfConfidence})`),
      ].join("\n\n"),
    }),
  );
  return { judge: object, judgeModel: helper.id };
}

/** 2단계: 세 모델에 동시에 묻고 비교 */
export async function askAll(
  question: string,
  prediction: string,
  priorKnowledge: string,
  mode: QuestionMode = "think",
  ctx: CallContext = newContext(),
): Promise<AnswerResult> {
  if (MOCK_AI) {
    const r = mockAnswer(question, mode);
    const promptChars = ANSWER_SYSTEM.length + question.length + prediction.length;
    await Promise.all(r.answers.map((a) => recordMock(ctx, "answer", promptChars, a.text.length)));
    await recordMock(ctx, "judge", JUDGE_SYSTEM.length + r.answers.reduce((n, a) => n + a.text.length, 0), JSON.stringify(r.judge).length);
    return r;
  }
  const providers = configuredProviders();
  if (providers.length === 0) throw new NoProviderError();

  const answers = await Promise.all(providers.map((p) => askOne(p, question, prediction, priorKnowledge, ctx)));
  const judged = await judgeAnswers(question, mode, answers, ctx);
  return { answers, judge: judged?.judge ?? null, judgeModel: judged?.judgeModel ?? null };
}

/** 3단계: 반성 */
export async function reflect(
  input: { question: string; prediction: string; answerSummary: string; reflection: string },
  ctx: CallContext = newContext(),
): Promise<ReflectResult> {
  if (MOCK_AI) {
    const r = mockReflect();
    await recordMock(ctx, "reflect", REFLECT_SYSTEM.length + input.question.length + input.answerSummary.length, JSON.stringify(r).length);
    return r;
  }
  const helper = getHelperModel();
  if (!helper) throw new NoProviderError();

  const { object } = await tracked({ ctx, purpose: "reflect", provider: helper.provider, model: helper.id }, () =>
    generateObject({
      model: helper.model,
      schema: reflectSchema,
      system: REFLECT_SYSTEM,
      prompt: [
        `어린이의 질문: """${input.question}"""`,
        `아이의 처음 예상: """${input.prediction || "(적지 않음)"}"""`,
        `AI 답변 요약: """${input.answerSummary}"""`,
        `아이가 적은 "알게 된 것": """${input.reflection || "(적지 않음)"}"""`,
      ].join("\n"),
    }),
  );
  return object;
}

const gameSchema = z.object({
  safe: z.boolean(),
  redirectMessage: z.string(),
  intro: z.string(),
  sentences: z
    .array(
      z.object({
        text: z.string(),
        isWrong: z.boolean(),
        mistakeType: z.enum(["number", "date", "name", "cause", "none"]),
        correction: z.string(),
        whyTricky: z.string(),
      }),
    )
    .max(8),
  lesson: z.string(),
});

/** 게임 모드: 일부러 틀린 문장이 섞인 설명글 만들기 */
export async function makeGamePuzzle(topic: string, ctx: CallContext = newContext()): Promise<GamePuzzle> {
  if (MOCK_AI) {
    const r = mockGame(topic);
    await recordMock(ctx, "game", GAME_SYSTEM.length + topic.length, JSON.stringify(r).length);
    return r;
  }
  const helper = getHelperModel();
  if (!helper) throw new NoProviderError();

  const { object } = await tracked({ ctx, purpose: "game", provider: helper.provider, model: helper.id }, () =>
    generateObject({
      model: helper.model,
      schema: gameSchema,
      system: GAME_SYSTEM,
      prompt: `게임 주제: """${topic}"""`,
    }),
  );

  // 맞는 문장의 mistakeType은 "none"으로, 틀린 문장이 하나도 없으면 게임이 성립하지 않으므로 다시 요청하게 한다.
  const sentences = object.sentences.map((s) => ({
    ...s,
    mistakeType: s.isWrong ? (s.mistakeType === "none" ? "cause" : s.mistakeType) : ("none" as const),
  }));
  if (object.safe && !sentences.some((s) => s.isWrong)) {
    throw new Error("게임 글에 틀린 문장이 만들어지지 않았어요.");
  }
  return { ...object, topic, sentences };
}
