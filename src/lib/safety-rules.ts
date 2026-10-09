/**
 * 규칙 기반 안전 필터. 모델 호출 없이 입력·출력 양쪽에 쓴다.
 * 서버 전용 import가 없어서 스크립트에서도 바로 테스트할 수 있다.
 */

export type SafetyCategory = "pii" | "profanity" | "sexual" | "selfharm" | "drugs" | "weapons" | "hate";

export type ScreenResult = { ok: true } | { ok: false; category: SafetyCategory; message: string };

/** 아이에게 보여 줄 안내. 자해는 막는 말보다 돌봄의 말이 먼저다. */
export const SAFETY_MESSAGE: Record<SafetyCategory, string> = {
  pii: "전화번호, 주소, 주민번호, 이메일 같은 개인 정보는 여기 적지 않아요. 그 부분을 빼고 다시 물어봐요.",
  profanity: "그런 말은 여기서 쓰지 않아요. 다른 말로 다시 적어 볼까요?",
  sexual: "이 질문은 여기서 다루기 어려워요. 궁금한 게 있으면 부모님이나 선생님께 물어봐요.",
  selfharm:
    "힘든 마음이 드는 것 같아요. 혼자 끙끙대지 말고 꼭 믿을 수 있는 어른에게 이야기해요. 청소년 상담전화 1388은 언제든 받아 줘요.",
  drugs: "이 질문은 여기서 다루기 어려워요. 궁금한 게 있으면 부모님이나 선생님께 물어봐요.",
  weapons: "이 질문은 여기서 다루기 어려워요. 궁금한 게 있으면 부모님이나 선생님께 물어봐요.",
  hate: "누군가를 깎아내리는 말은 여기서 쓰지 않아요. 다른 질문을 해 볼까요?",
};

const RULES: { category: SafetyCategory; re: RegExp; inputOnly?: boolean }[] = [
  // 개인정보: 전화번호, 주민등록번호, 이메일, 상세 주소(동·호수)
  { category: "pii", re: /01[016789][-.\s]?\d{3,4}[-.\s]?\d{4}/ },
  { category: "pii", re: /\b\d{6}[-\s]?[1-4]\d{6}\b/ },
  { category: "pii", re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/ },
  { category: "pii", re: /\d+동\s*\d+호/ },
  // 욕설
  { category: "profanity", re: /(시발|씨발|씨바|ㅅㅂ|병신|ㅂㅅ|개새끼|좆|존나|ㅈㄴ|닥쳐|꺼져|미친놈|미친년|fuck|shit|bitch)/i },
  // 성적 표현
  { category: "sexual", re: /(섹스|성관계|야동|야한|포르노|porn|sex\b|자위|성기|음란|발기|콘돔)/i },
  // 자해·자살
  { category: "selfharm", re: /(자살|자해|죽고\s*싶|죽어버리|목을\s*매|손목을?\s*긋|suicide|kill\s*myself)/i },
  // 약물
  { category: "drugs", re: /(마약|대마|필로폰|히로뽕|코카인|헤로인|펜타닐|엑스터시|본드\s*흡입|부탄가스)/i },
  // 무기·폭발물 제작
  { category: "weapons", re: /((폭탄|폭발물|사제\s*총|총기|화약|독약|독가스)\s*(만드|제조|만들)|(만드|제조|만들)\S*\s*(폭탄|폭발물|사제\s*총|화약|독약))/ },
  // 혐오
  { category: "hate", re: /(장애인\s*새끼|급식충|틀딱|한남충|김치녀|짱깨|쪽바리)/ },
];

function normalize(text: string): string {
  // 글자 사이 공백·점·특수문자로 필터를 피하는 것을 막기 위해 가볍게 정리한다 (예: "시 발", "시.발")
  return text.replace(/[\s.\-_*]+(?=[가-힣])/g, "").replace(/\s+/g, " ");
}

/** 아이의 입력 검사 */
export function screenInput(text: string): ScreenResult {
  const candidates = [text, normalize(text)];
  for (const rule of RULES) {
    if (candidates.some((t) => rule.re.test(t))) {
      return { ok: false, category: rule.category, message: SAFETY_MESSAGE[rule.category] };
    }
  }
  return { ok: true };
}

/** AI 출력 검사. 개인정보 규칙(아이 입력용)은 출력엔 적용하지 않고, 욕설·성적·혐오·무기·약물을 본다. */
export function screenOutput(texts: string[]): ScreenResult {
  const joined = texts.filter(Boolean).join("\n");
  const candidates = [joined, normalize(joined)];
  for (const rule of RULES) {
    if (rule.category === "pii" || rule.category === "selfharm") continue;
    if (candidates.some((t) => rule.re.test(t))) {
      return { ok: false, category: rule.category, message: SAFETY_MESSAGE[rule.category] };
    }
  }
  // 링크는 아이에게 보여 주지 않는다 (피싱·부적절 사이트 방지)
  if (/https?:\/\/|www\./i.test(joined)) {
    return { ok: false, category: "pii", message: "" };
  }
  return { ok: true };
}
