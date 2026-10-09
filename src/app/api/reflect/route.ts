import { checkQuota } from "@/lib/quota";
import { newContext } from "@/lib/usage";
import { reflect } from "@/lib/ai";
import { checkInput, checkOutput } from "@/lib/safety";
import type { ReflectResult } from "@/lib/types";
import { MAX_FIELD_LEN, MAX_QUESTION_LEN, clean, errorResponse, requireChild } from "@/lib/api-utils";

export async function POST(request: Request) {
  const auth = await requireChild();
  if ("response" in auth) return auth.response;
  const limited = await checkQuota(auth.child, "question", false);
  if (limited) return limited;
  const body = await request.json().catch(() => ({}));
  const question = clean(body.question, MAX_QUESTION_LEN);
  if (question.length < 2) {
    return Response.json({ error: "질문이 비어 있어요." }, { status: 400 });
  }
  const prediction = clean(body.prediction, MAX_FIELD_LEN);
  const reflection = clean(body.reflection, MAX_FIELD_LEN);
  const input = await checkInput([question, prediction, reflection], { childId: auth.child.id, route: "reflect" });
  if (!input.ok) return Response.json({ error: input.message, code: "SAFETY" }, { status: 400 });
  try {
    const ctx = newContext(auth.child.id);
    const result = await reflect({ question, prediction, answerSummary: clean(body.answerSummary, 2000), reflection }, ctx);
    if (!(await checkOutput([result.encouragement, result.comparison, result.verifyTip, result.nextQuestion], { ...ctx, route: "reflect" }))) {
      // 안전한 고정 문구로 대체한다. 과정을 칭찬하는 말은 내용과 무관하게 참이다.
      const fallback: ReflectResult = {
        encouragement: "답을 보기 전에 스스로 생각하고, 끝까지 정리까지 한 건 정말 멋진 공부 습관이에요.",
        comparison: "처음 예상과 AI 답이 어디가 같고 달랐는지 한 번 더 떠올려 봐요.",
        verifyTip: "이 주제를 교과서나 학교 도서관 책에서 한 번 찾아봐요.",
        nextQuestion: "오늘 알게 된 것에서 더 궁금한 건 뭐예요?",
      };
      return Response.json(fallback);
    }
    return Response.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}
