export type ProviderId = "claude" | "gemini" | "chatgpt";

export const PROVIDER_LABEL: Record<ProviderId, string> = {
  claude: "클로드",
  gemini: "제미나이",
  chatgpt: "챗지피티",
};

/** 질문 종류: 아이가 스스로 추론해 볼 만한 질문(think) vs 단순 사실·정의·환산(direct) */
export type QuestionMode = "think" | "direct";

/** 1단계: 질문을 받고 종류를 나눈 뒤, 생각이 필요한 질문이면 "생각 먼저" 안내를 만든다. */
export type ThinkFirstResult = {
  safe: boolean;
  mode: QuestionMode;
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

export type Puzzle = {
  question: string;
  hint: string;
  /** 풀이와 답. 아이가 자기 답을 적은 뒤에만 보여 준다. */
  solution: string;
};

/** 첫 답. 모델 하나만 호출한다. 바로 답한 질문이면 되묻는 질문과 퍼즐도 같은 호출에서 받는다. */
export type AnswerResult = {
  answer: ModelAnswer;
  /** 바로 답한 질문일 때: AI가 아이에게 되묻는 이어지는 질문 (예: "그럼 해까지는 얼마나 멀까?") */
  followUps: string[];
  /** 바로 답한 질문일 때: 그 사실을 바탕으로 추론해 보는 문제 */
  puzzles: Puzzle[];
};

/** "다른 AI는 뭐라고 할까?"를 눌렀을 때만 호출한다. 나머지 모델의 답과 전체 비교 판정. */
export type CompareResult = {
  answers: ModelAnswer[];
  judge: JudgeResult | null;
  judgeModel: string | null;
};

/** 질문 기록에 JSON으로 남기는 답변 묶음 */
export type AnswerLog = { answer: ModelAnswer; comparison: CompareResult | null };

/** 3단계: 반성 단계 피드백 */
export type ReflectResult = {
  encouragement: string;
  comparison: string;
  verifyTip: string;
  nextQuestion: string;
};


/** 틀린 거 찾기 게임: AI가 일부러 틀린 문장을 섞어 만든 설명글 */
export type MistakeType = "number" | "date" | "name" | "cause" | "none";

export const MISTAKE_TYPE_LABEL: Record<Exclude<MistakeType, "none">, string> = {
  number: "숫자를 바꿔치기",
  date: "날짜·순서를 바꿔치기",
  name: "이름·장소를 바꿔치기",
  cause: "그럴듯한 가짜 이유",
};

export type GameSentence = {
  text: string;
  isWrong: boolean;
  mistakeType: MistakeType;
  /** isWrong일 때 올바른 내용 */
  correction: string;
  /** 왜 이 거짓말이 그럴듯한지 */
  whyTricky: string;
};

export type GamePuzzle = {
  safe: boolean;
  redirectMessage: string;
  topic: string;
  intro: string;
  sentences: GameSentence[];
  lesson: string;
};

