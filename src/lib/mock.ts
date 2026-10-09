import type { AnswerResult, GamePuzzle, ReflectResult, ThinkFirstResult } from "./types";

/** API 키 없이 UI를 돌려 보기 위한 가짜 응답 (MOCK_AI=1) */

export function mockThink(question: string): ThinkFirstResult {
  return {
    safe: true,
    redirectMessage: "",
    topicLabel: question.slice(0, 12),
    guidingQuestion: "이 질문과 비슷한 걸 본 적이 있나요? 그때 어떤 모습이었는지 떠올려 봐요.",
    predictionPrompt: "답이 뭘지 한번 예상해 봐요. 틀려도 전혀 괜찮아요. 예상하는 것 자체가 공부예요.",
    hint: "'왜'가 아니라 '어떻게 되는지'를 먼저 떠올리면 실마리가 보여요.",
  };
}

export function mockAnswer(question: string): AnswerResult {
  const base = `"${question}"에 대한 답이에요. 가장 중요한 건 이거예요. 첫째, 핵심 원리를 짧게 말해요. 둘째, 예를 하나 들어요.`;
  return {
    answers: [
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
    ],
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
