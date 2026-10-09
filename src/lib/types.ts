export type ProviderId = "claude" | "gemini" | "chatgpt";

export const PROVIDER_LABEL: Record<ProviderId, string> = {
  claude: "클로드",
  gemini: "제미나이",
  chatgpt: "챗지피티",
};

/** 1단계: 질문을 받고 "생각 먼저" 안내를 만든다. */
export type ThinkFirstResult = {
  safe: boolean;
  /** safe가 false일 때 아이에게 보여줄 부드러운 안내 */
  redirectMessage: string;
  topicLabel: string;
  guidingQuestion: string;
  predictionPrompt: string;
  hint: string;
};

/** 모델 하나의 답변 */
export type ModelAnswer = {
  provider: ProviderId;
  model: string;
  ok: boolean;
  text: string;
  /** 모델 스스로 밝힌 확신도 */
  selfConfidence: "high" | "medium" | "low";
  /** 모델 스스로 꼽은 "꼭 확인해야 할 부분" */
  uncertainParts: string[];
  error?: string;
};

export type Agreement = "agree" | "partly" | "disagree";

/** 세 답변을 비교한 결과 */
export type JudgeResult = {
  agreement: Agreement;
  kidSummary: string;
  differences: string[];
  riskyClaims: { claim: string; why: string }[];
  checkTips: string[];
};

export type AnswerResult = {
  answers: ModelAnswer[];
  judge: JudgeResult | null;
  judgeModel: string | null;
};

/** 3단계: 반성 단계 피드백 */
export type ReflectResult = {
  encouragement: string;
  comparison: string;
  verifyTip: string;
  nextQuestion: string;
};

/** 브라우저 localStorage에 저장하는 한 번의 질문 기록 */
export type SessionRecord = {
  id: string;
  createdAt: string;
  question: string;
  topicLabel: string;
  prediction: string;
  priorKnowledge: string;
  usedHint: boolean;
  agreement: Agreement | null;
  comparedModels: boolean;
  reflection: string;
  doubtedAi: boolean;
};
