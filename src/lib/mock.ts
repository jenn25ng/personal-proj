import type { AnswerResult, CompareResult, GamePuzzle, ModelAnswer, QuestionMode, ReflectResult, RespondResult } from "./types";
import type { ThreadContext } from "./threads";

/** API 키 없이 UI를 돌려 보기 위한 가짜 응답 (MOCK_AI=1) */

/**
 * 목 모드의 한 번 호출. 간단한 규칙으로 종류를 나눈다.
 * - "새 주제:"로 시작하면 newTopic
 * - "왜/어떻게/될까"면 think (허용될 때만)
 * - 마음 이야기·작업 지시 낱말이 있으면 talk/task
 * - "뭐라고?"가 들어가면 되묻기(clarify) 예시
 */
export function mockRespond(message: string, thread: ThreadContext) {
  const newTopic = /^새 주제[: ]/.test(message) || !thread.memory;
  const text = message.replace(/^새 주제[: ]\s*/, "");
  const topic = text.slice(0, 12);
  const base: RespondResult = {
    kind: "direct",
    newTopic,
    topic,
    safe: true,
    care: false,
    redirect: "",
    clarify: "",
    guide: "",
    predict: "",
    hint: "",
    answer: null,
    followUps: [],
    puzzles: [],
    suggestCompare: false,
  };
  const memory = `주제: ${topic}. 턴 ${thread.turnCount + 1}. 확정된 사실: 목 모드 예시.`;
  const done = (r: Partial<RespondResult>, suggestedAdult = false) => ({ result: { ...base, ...r }, memory, suggestedAdult, provider: "claude" as const, model: "mock-claude" });
  if (/뭐라고\?/.test(text)) return done({ clarify: "혹시 '달까지 거리'를 말하는 거예요?" });
  // 목 모드에서 자기 검사 막힘을 흉내 내는 트리거
  if (/자기검사실패/.test(text)) return done({ kind: "direct", safe: false, redirect: "이번 답은 보여 줄 수 없었어요. 다른 말로 다시 물어보거나, 부모님이나 선생님께 물어봐요." });
  if (/사라지고 싶|없어졌으면/.test(text)) {
    return done({ kind: "talk", care: true, redirect: "많이 힘들었구나. 그런 마음이 들 땐 혼자 두지 말고 믿을 수 있는 어른에게 꼭 말해요. 청소년 상담전화 1388은 언제든 받아 줘요." });
  }
  const answer = (t: string, conf: ModelAnswer["selfConfidence"] = "medium", unsure: string[] = []): ModelAnswer => ({ provider: "claude", model: "mock-claude", ok: true, text: t, selfConfidence: conf, uncertainParts: unsure });
  if (/맞아\?|검증|진짜야/.test(text)) {
    return done({ kind: "task", answer: answer("솔직히 말하면 제 답의 숫자 부분은 확실하지 않아요. 다른 AI한테도 같은 걸 물어서 비교해 보면 어디가 다른지 보여요.", "low", ["숫자 부분"]), suggestCompare: true });
  }
  if (/정리|다시|자세히|쉽게|핵심/.test(text)) {
    return done({ kind: "task", answer: answer(`직전 답을 바탕으로 정리했어요. ${thread.lastAnswer ? "핵심은 첫 문장에 있어요." : "앞 답이 없어서 간단히만 적을게요."}`, "high") });
  }
  if (/좋아해|사귈래|힘들|어려워|못하면|멍충|꿈이|어떻게 해야/.test(text)) {
    const stuck = /아무리 해도|전혀/.test(text) && !thread.adultSuggested;
    return done(
      {
        kind: "talk",
        answer: answer(stuck ? "그랬구나. 열심히 했는데 안 늘면 정말 속상하죠. 이런 건 어디서 막히는지 선생님이 보면 금방 찾아 줄 수 있어요. 지금은 어떤 문제가 제일 어려워요?" : "그랬구나. 그런 마음이 들 수 있어요. 지금 어렵다고 앞으로도 못하는 건 아니에요. 제일 막히는 게 뭐예요?", "high"),
      },
      stuck,
    );
  }
  if (thread.thinkAllowed && /왜|어떻게|될까|어떨까|나을까/.test(text)) {
    return done({
      kind: "think",
      guide: "이 질문과 비슷한 걸 본 적이 있나요? 그때 어떤 모습이었는지 떠올려 봐요.",
      predict: "답이 뭘지 한번 예상해 봐요. 틀려도 전혀 괜찮아요. 예상하는 것 자체가 공부예요.",
      hint: "'왜'가 아니라 '어떻게 되는지'를 먼저 떠올리면 실마리가 보여요.",
    });
  }
  const first = !thread.firstDirectDone;
  return done({
    kind: "direct",
    answer: answer(`"${text}"에 대한 답이에요. 가장 중요한 건 이거예요. 이 현상은 1년에 약 12번 일어나요. 이 부분은 확실하지 않아요.`, "medium", ["1년에 12번이라는 횟수"]),
    followUps: first ? ["그럼 해까지는 얼마나 멀까? 달보다 몇 배쯤일 것 같아?", "비행기로 달까지 가면 며칠이나 걸릴까?"] : [],
    puzzles: first
      ? [
          {
            question: "달까지는 약 38만 km예요. 시속 100km로 달리는 자동차로 쉬지 않고 가면 며칠이 걸릴까요?",
            hint: "먼저 몇 시간이 걸리는지 구한 다음, 하루는 24시간이라는 걸 떠올려요.",
            solution: "380,000 ÷ 100 = 3,800시간. 3,800 ÷ 24 ≈ 158일. 약 다섯 달 넘게 걸려요.",
          },
        ]
      : [],
  });
}

function mockAnswers(question: string): ModelAnswer[] {
  const base = `"${question}"에 대한 답이에요. 가장 중요한 건 이거예요. 첫째, 핵심 원리를 짧게 말해요. 둘째, 예를 하나 들어요.`;
  return [
    {
      provider: "claude",
      model: "mock-claude",
      ok: true,
      text: `${base} 이 현상은 1년에 약 12번 일어나요. 이 부분은 확실하지 않아요.`,
      selfConfidence: "medium",
      uncertainParts: ["1년에 12번이라는 횟수"],
    },
    {
      provider: "gemini",
      model: "mock-gemini",
      ok: true,
      text: `${base} 이 현상은 1년에 약 13번 일어나요.`,
      selfConfidence: "high",
      uncertainParts: [],
    },
    {
      provider: "chatgpt",
      model: "mock-chatgpt",
      ok: false,
      text: "",
      selfConfidence: "low",
      uncertainParts: [],
      error: "MOCK: 응답 실패 예시",
    },
  ];
}

/** 생각 먼저 질문의 답 */
export function mockAnswer(question: string, mode: QuestionMode = "think"): AnswerResult {
  void mode;
  return { answer: mockAnswers(question)[0], followUps: [], puzzles: [] };
}

/** 비교를 눌렀을 때: 나머지 모델의 답과 판정 */
export function mockCompare(question: string): CompareResult {
  return {
    answers: mockAnswers(question).slice(1),
    judge: {
      agreement: "partly",
      kidSummary:
        "두 AI 모두 핵심 원리는 같게 말했어요. 하지만 1년에 몇 번 일어나는지는 12번과 13번으로 서로 달라요. 그래서 누가 맞는지 확인이 필요해요.",
      differences: ["클로드는 12번, 제미나이는 13번이라고 했어요."],
      riskyClaims: [{ claim: "1년에 12번 또는 13번", why: "숫자는 AI가 자주 틀리는 부분이에요." }],
      checkTips: ["과학 교과서에서 이 단원을 찾아봐요.", "학교 도서관 백과사전에서 확인해요.", "선생님께 어느 쪽이 맞는지 여쭤봐요."],
    },
    judgeModel: "mock-judge",
  };
}

export function mockReflect(): ReflectResult {
  return {
    encouragement: "답을 보기 전에 스스로 예상을 적은 건 정말 멋진 공부 습관이에요.",
    comparison: "처음 예상은 원리 부분이 맞았고, 횟수는 달랐어요.",
    verifyTip: "과학 교과서 차례에서 이 단원을 찾아 숫자를 직접 확인해 봐요.",
    nextQuestion: "그럼 이 현상이 다른 행성에서도 똑같이 일어날까요?",
  };
}

export function mockGame(topic: string): GamePuzzle {
  return {
    safe: true,
    redirectMessage: "",
    topic,
    intro: `AI가 "${topic}"에 대해 설명한 글이에요. 그런데 두 문장이 틀렸어요!`,
    sentences: [
      { text: "달은 지구 주위를 도는 위성이에요.", isWrong: false, mistakeType: "none", correction: "", whyTricky: "" },
      {
        text: "달이 지구를 한 바퀴 도는 데는 약 7일이 걸려요.",
        isWrong: true,
        mistakeType: "number",
        correction: "달이 지구를 한 바퀴 도는 데는 약 27일이 걸려요.",
        whyTricky: "7일은 일주일이라 익숙한 숫자여서 그럴듯하게 들려요.",
      },
      { text: "달은 스스로 빛을 내지 못하고 햇빛을 반사해요.", isWrong: false, mistakeType: "none", correction: "", whyTricky: "" },
      {
        text: "달의 모양이 바뀌는 건 지구 그림자가 달을 가리기 때문이에요.",
        isWrong: true,
        mistakeType: "cause",
        correction: "달의 모양이 바뀌는 건 달이 지구를 돌면서 햇빛을 받는 부분이 우리에게 다르게 보이기 때문이에요.",
        whyTricky: "많은 사람이 그렇게 알고 있어서 틀린 줄 모르기 쉬워요.",
      },
      { text: "달에는 공기가 거의 없어요.", isWrong: false, mistakeType: "none", correction: "", whyTricky: "" },
    ],
    lesson: "오늘 AI는 숫자를 슬쩍 바꾸고, 그럴듯한 가짜 이유를 붙였어요. AI 답에서 숫자와 '~때문이에요'가 나오면 한 번 더 확인해요.",
  };
}
