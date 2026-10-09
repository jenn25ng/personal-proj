import { checkQuota } from "@/lib/quota";
import { newContext } from "@/lib/usage";
import { askPrimary } from "@/lib/ai";
import { checkInput, checkOutput } from "@/lib/safety";
import type { AnswerResult } from "@/lib/types";
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
  const input = await checkInput([question, prediction, priorKnowledge], { childId: auth.child.id, route: "answer" });
  if (!input.ok) return Response.json({ error: input.message, code: "SAFETY" }, { status: 400 });
  try {
    const ctx = newContext(auth.child.id);
    const result = await askPrimary(question, prediction, priorKnowledge, mode, ctx);
    if (result.answer.ok) {
      const texts = [result.answer.text, ...result.answer.uncertainParts, ...result.followUps, ...result.puzzles.flatMap((p) => [p.question, p.hint, p.solution])];
      if (!(await checkOutput(texts, { ...ctx, route: "answer" }))) {
        const blocked: AnswerResult = {
          answer: { ...result.answer, ok: false, text: "", uncertainParts: [], error: "blocked" },
          followUps: [],
          puzzles: [],
        };
        return Response.json(blocked);
      }
    }
    return Response.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}
