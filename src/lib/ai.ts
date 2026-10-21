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
import { ANSWER_SYSTEM, GAME_SYSTEM, JUDGE_SYSTEM, REFLECT_SYSTEM, RESPOND_SYSTEM } from "./prompts";
import { mockAnswer, mockCompare, mockGame, mockReflect, mockRespond } from "./mock";
import { contextToPrompt, EMPTY_CONTEXT, type ThreadContext } from "./threads";
import { newContext, recordMock, tracked, type CallContext } from "./usage";
import { reportError } from "./monitor";
import { BLOCKED_OUTPUT_MESSAGE, recordSelfBlock } from "./safety";
import type {
  AnswerResult,
  CompareResult,
  GamePuzzle,
  JudgeResult,
  ModelAnswer,
  ProviderId,
  QuestionMode,
  ReflectResult,
  RespondResult,
} from "./types";

export class NoProviderError extends Error {
  constructor() {
    super("AI 제공사 API 키가 하나도 설정되지 않았어요. .env.local을 확인하세요.");
  }
}

const puzzleSchema = z.object({ question: z.string(), hint: z.string(), solution: z.string() });

/** 한 번의 호출로 종류 판단 + (생각 먼저가 아니면) 답 + 요약 갱신. 필드 이름은 출력 토큰을 아끼려고 짧게 둔다. */
const respondSchema = z.object({
  kind: z.enum(["think", "direct", "talk", "task"]),
  newTopic: z.boolean(),
  topic: z.string(),
  safe: z.boolean(),
  care: z.boolean(),
  redirect: z.string(),
  clarify: z.string(),
  guide: z.string(),
  predict: z.string(),
  hint: z.string(),
  answer: z.string(),
  conf: z.enum(["high", "medium", "low"]),
  unsure: z.array(z.string()).max(2),
  followUps: z.array(z.string()).max(2),
  puzzles: z.array(puzzleSchema).max(1),
  suggestCompare: z.boolean(),
  suggestedAdult: z.boolean(),
  okForKid: z.boolean(),
  memory: z.string(),
});

const answerSchema = z.object({
  answer: z.string(),
  selfConfidence: z.enum(["high", "medium", "low"]),
  uncertainParts: z.array(z.string()).max(2),
  okForKid: z.boolean(),
  memory: z.string(),
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

/** 서버가 스레드 상태를 갱신하는 데 쓰는, 모델이 함께 돌려준 값 */
export type RespondOutcome = { result: RespondResult; memory: string; suggestedAdult: boolean; provider: ProviderId; model: string };

/**
 * 메시지 하나에 대한 호출 1회. 종류를 판단하고, 생각 먼저가 아니면 같은 호출에서 답과 요약까지 받는다.
 * 대부분의 메시지(이어 묻기, 바로 답, 마음 이야기, 작업 지시)가 이 호출 하나로 끝난다.
 */
export async function respond(message: string, thread: ThreadContext = EMPTY_CONTEXT, ctx: CallContext = newContext()): Promise<RespondOutcome> {
  if (MOCK_AI) {
    const r = mockRespond(message, thread);
    await recordMock(ctx, "respond", RESPOND_SYSTEM.length + message.length + thread.memory.length, JSON.stringify(r).length);
    return r;
  }
  const provider = primaryProvider();
  if (!provider) throw new NoProviderError();
  const model = DEFAULT_MODELS[provider];
  const { object } = await tracked({ ctx, purpose: "respond", provider, model }, () =>
    generateObject({
      model: getModel(provider),
      schema: respondSchema,
      system: RESPOND_SYSTEM,
      prompt: `${contextToPrompt(thread)}\n\n아이의 메시지: """${message}"""`,
      providerOptions: answerProviderOptions(provider),
    }),
  );
  const kind = object.kind === "think" && !thread.thinkAllowed ? "direct" : object.kind;
  // 자기 검사: 모델이 자기 답을 아이에게 보여도 된다고 하지 않으면 답을 비우고 안내로 바꾼다. 별도 검사 호출 없이 같은 호출에서 끝난다.
  if (!object.okForKid) {
    await recordSelfBlock(ctx, "message", [object.answer, object.guide, object.clarify].filter(Boolean).join(" "));
    const blockedResult: RespondResult = {
      kind: kind === "think" ? "direct" : kind,
      newTopic: object.newTopic,
      topic: object.topic,
      safe: false,
      care: false,
      redirect: BLOCKED_OUTPUT_MESSAGE,
      clarify: "",
      guide: "",
      predict: "",
      hint: "",
      answer: null,
      followUps: [],
      puzzles: [],
      suggestCompare: false,
    };
    return { result: blockedResult, memory: thread.memory, suggestedAdult: false, provider, model };
  }
  const hasAnswer = object.safe && !object.care && !object.clarify && kind !== "think" && object.answer.trim().length > 0;
  const result: RespondResult = {
    kind,
    newTopic: object.newTopic,
    topic: object.topic,
    safe: object.safe,
    care: object.care,
    redirect: object.redirect,
    clarify: object.clarify,
    guide: kind === "think" ? object.guide : "",
    predict: kind === "think" ? object.predict : "",
    hint: kind === "think" ? object.hint : "",
    answer: hasAnswer
      ? { provider, model, ok: true, text: object.answer, selfConfidence: object.conf, uncertainParts: object.unsure }
      : null,
    followUps: hasAnswer && kind === "direct" && !thread.firstDirectDone ? object.followUps : [],
    puzzles: hasAnswer && kind === "direct" && !thread.firstDirectDone ? object.puzzles : [],
    suggestCompare: hasAnswer && object.suggestCompare,
  };
  return { result, memory: object.memory, suggestedAdult: object.suggestedAdult, provider, model };
}

type AskOneResult = { answer: ModelAnswer; followUps: string[]; puzzles: AnswerResult["puzzles"]; memory: string };

async function askOne(
  provider: ProviderId,
  question: string,
  prediction: string,
  priorKnowledge: string,
  mode: QuestionMode,
  ctx: CallContext,
  memory = "",
): Promise<AskOneResult> {
  const model = DEFAULT_MODELS[provider];
  const prompt = [
    memory ? `대화 요약: """${memory}"""` : "",
    `어린이의 질문: """${question}"""`,
    `질문 종류: ${mode === "think" ? "생각 먼저 질문" : "바로 답한 질문"}`,
    priorKnowledge ? `아이가 이미 알고 있다고 적은 것: """${priorKnowledge}"""` : "",
    prediction ? `아이의 예상: """${prediction}"""` : "아이의 예상: (건너뜀)",
  ]
    .filter(Boolean)
    .join("\n");
  try {
    const { object } = await tracked({ ctx, purpose: "answer", provider, model }, () =>
      generateObject({
        model: getModel(provider),
        schema: answerSchema,
        system: ANSWER_SYSTEM,
        prompt,
        providerOptions: answerProviderOptions(provider),
      }),
    );
    if (!object.okForKid) {
      await recordSelfBlock(ctx, "answer", object.answer);
      return {
        answer: { provider, model, ok: false, text: "", selfConfidence: "low", uncertainParts: [], error: "blocked" },
        followUps: [],
        puzzles: [],
        memory: "",
      };
    }
    return {
      answer: {
        provider,
        model,
        ok: true,
        text: object.answer,
        selfConfidence: object.selfConfidence,
        uncertainParts: object.uncertainParts,
      },
      followUps: [],
      puzzles: [],
      memory: object.memory,
    };
  } catch (err) {
    await reportError("ai.answer", err, { provider, model, mode });
    return {
      answer: {
        provider,
        model,
        ok: false,
        text: "",
        selfConfidence: "low",
        uncertainParts: [],
        error: err instanceof Error ? err.message : String(err),
      },
      followUps: [],
      puzzles: [],
      memory: "",
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

/** 첫 답 모델: Claude가 설정돼 있으면 Claude, 아니면 설정된 첫 제공사 */
function primaryProvider(): ProviderId | null {
  const providers = configuredProviders();
  if (providers.length === 0) return null;
  return providers.includes("claude") ? "claude" : providers[0];
}

/** 생각 먼저 질문의 답. 아이가 예상을 적은(또는 건너뛴) 뒤 한 번 부른다. */
export async function askPrimary(
  question: string,
  prediction: string,
  priorKnowledge: string,
  mode: QuestionMode = "think",
  ctx: CallContext = newContext(),
  memory = "",
): Promise<AnswerResult & { memory: string }> {
  if (MOCK_AI) {
    const r = mockAnswer(question, mode);
    await recordMock(ctx, "answer", ANSWER_SYSTEM.length + question.length + prediction.length + memory.length, r.answer.text.length);
    return { ...r, memory: `주제: ${question.slice(0, 20)}. 예상: ${prediction.slice(0, 40) || "건너뜀"}.` };
  }
  const provider = primaryProvider();
  if (!provider) throw new NoProviderError();
  const r = await askOne(provider, question, prediction, priorKnowledge, mode, ctx, memory);
  return { answer: r.answer, followUps: [], puzzles: [], memory: r.memory };
}

/** "다른 AI는 뭐라고 할까?"를 눌렀을 때만: 나머지 모델에 묻고, 첫 답까지 합쳐 비교한다. */
export async function compareAnswers(
  question: string,
  prediction: string,
  priorKnowledge: string,
  mode: QuestionMode,
  primary: ModelAnswer,
  ctx: CallContext = newContext(),
  memory = "",
): Promise<CompareResult> {
  if (MOCK_AI) {
    const r = mockCompare(question);
    const promptChars = ANSWER_SYSTEM.length + question.length + prediction.length + memory.length;
    await Promise.all(r.answers.map((a) => recordMock(ctx, "answer", promptChars, a.text.length)));
    await recordMock(ctx, "judge", JUDGE_SYSTEM.length + r.answers.reduce((n, a) => n + a.text.length, 0), JSON.stringify(r.judge).length);
    return r;
  }
  const providers = configuredProviders().filter((p) => p !== primary.provider);
  // 다른 AI에게는 대화 전체가 아니라 요약만 보낸다. 입력이 비싼 모델이라 문맥 길이를 고정한다.
  const others = await Promise.all(
    providers.map((p) => askOne(p, question, prediction, priorKnowledge, mode, ctx, memory).then((r) => r.answer)),
  );
  const judged = await judgeAnswers(question, mode, [primary, ...others], ctx);
  return { answers: others, judge: judged?.judge ?? null, judgeModel: judged?.judgeModel ?? null };
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
