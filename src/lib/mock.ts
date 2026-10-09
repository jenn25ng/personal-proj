import type { AnswerResult, ReflectResult, ThinkFirstResult } from "./types";

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
