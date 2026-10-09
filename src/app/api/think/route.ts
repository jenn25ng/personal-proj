import { checkQuota } from "@/lib/quota";
import { newContext } from "@/lib/usage";
import { thinkFirst } from "@/lib/ai";
import { checkInput, checkOutput } from "@/lib/safety";
import type { ThinkFirstResult } from "@/lib/types";
import { MAX_QUESTION_LEN, clean, errorResponse, requireChild } from "@/lib/api-utils";

export async function POST(request: Request) {
  const auth = await requireChild();
  if ("response" in auth) return auth.response;
  const limited = await checkQuota(auth.child, "question", true);
  if (limited) return limited;
  const body = await request.json().catch(() => ({}));
  const question = clean(body.question, MAX_QUESTION_LEN);
  if (question.length < 2) {
    return Response.json({ error: "질문을 조금 더 적어 주세요." }, { status: 400 });
  }
  // 입력 필터: 걸리면 AI에게 보내지 않고, 화면이 아는 "안전하지 않은 질문" 모양으로 안내를 돌려준다.
  const input = await checkInput([question], { childId: auth.child.id, route: "think" });
  if (!input.ok) {
    const blocked: ThinkFirstResult = {
      safe: false,
      redirectMessage: input.message,
      mode: "direct",
      topicLabel: "",
      guidingQuestion: "",
      predictionPrompt: "",
      hint: "",
    };
    return Response.json(blocked);
  }
  try {
    const ctx = newContext(auth.child.id);
    const result = await thinkFirst(question, ctx);
    // 출력 필터(규칙만): 생각 단계 문장은 짧아서 모델 검사는 생략한다.
    const ok = await checkOutput([result.redirectMessage, result.guidingQuestion, result.predictionPrompt, result.hint], { ...ctx, route: "think" }, { model: false });
    if (!ok) {
      return Response.json({ ...result, safe: false, redirectMessage: "이 질문은 여기서 다루기 어려워요. 부모님이나 선생님께 물어봐요." } satisfies ThinkFirstResult);
    }
    return Response.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}
