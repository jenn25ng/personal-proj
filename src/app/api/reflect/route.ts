import { reflect } from "@/lib/ai";
import { MAX_FIELD_LEN, MAX_QUESTION_LEN, clean, errorResponse, requireChild } from "@/lib/api-utils";

export async function POST(request: Request) {
  const auth = await requireChild();
  if ("response" in auth) return auth.response;
  const body = await request.json().catch(() => ({}));
  const question = clean(body.question, MAX_QUESTION_LEN);
  if (question.length < 2) {
    return Response.json({ error: "질문이 비어 있어요." }, { status: 400 });
  }
  try {
    return Response.json(
      await reflect({
        question,
        prediction: clean(body.prediction, MAX_FIELD_LEN),
        answerSummary: clean(body.answerSummary, 2000),
        reflection: clean(body.reflection, MAX_FIELD_LEN),
      }),
    );
  } catch (err) {
    return errorResponse(err);
  }
}
