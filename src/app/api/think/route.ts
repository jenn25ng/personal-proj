import { checkQuota } from "@/lib/quota";
import { newContext } from "@/lib/usage";
import { thinkFirst } from "@/lib/ai";
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
  try {
    return Response.json(await thinkFirst(question, newContext(auth.child.id)));
  } catch (err) {
    return errorResponse(err);
  }
}
