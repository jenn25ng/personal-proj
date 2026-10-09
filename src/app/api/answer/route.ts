import { checkQuota } from "@/lib/quota";
import { newContext } from "@/lib/usage";
import { askPrimary } from "@/lib/ai";
import { MAX_FIELD_LEN, MAX_QUESTION_LEN, clean, errorResponse, requireChild } from "@/lib/api-utils";

export const maxDuration = 120;

export async function POST(request: Request) {
  const auth = await requireChild();
  if ("response" in auth) return auth.response;
  const limited = await checkQuota(auth.child, "question", false);
  if (limited) return limited;
  const body = await request.json().catch(() => ({}));
  const question = clean(body.question, MAX_QUESTION_LEN);
  const prediction = clean(body.prediction, MAX_FIELD_LEN);
  const priorKnowledge = clean(body.priorKnowledge, MAX_FIELD_LEN);
  const mode = body.mode === "direct" ? "direct" : "think";
  if (question.length < 2) {
    return Response.json({ error: "질문이 비어 있어요." }, { status: 400 });
  }
  try {
    return Response.json(await askPrimary(question, prediction, priorKnowledge, mode, newContext(auth.child.id)));
  } catch (err) {
    return errorResponse(err);
  }
}
