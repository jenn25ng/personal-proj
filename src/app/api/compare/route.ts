import { checkQuota } from "@/lib/quota";
import { compareAnswers } from "@/lib/ai";
import { checkInput, checkOutput } from "@/lib/safety";
import { MAX_FIELD_LEN, MAX_QUESTION_LEN, clean, errorResponse, requireChild } from "@/lib/api-utils";
import type { CompareResult, ModelAnswer } from "@/lib/types";
import { newContext } from "@/lib/usage";

export const maxDuration = 120;

const PROVIDERS = new Set(["claude", "gemini", "chatgpt"]);
const CONF = new Set(["high", "medium", "low"]);

/** 버튼을 눌렀을 때만 나머지 모델을 부른다. 첫 답은 클라이언트가 그대로 돌려보낸다. */
export async function POST(request: Request) {
  const auth = await requireChild();
  if ("response" in auth) return auth.response;
  const limited = await checkQuota(auth.child, "question", false);
  if (limited) return limited;
  const body = await request.json().catch(() => ({}));
  const question = clean(body.question, MAX_QUESTION_LEN);
  if (question.length < 2) return Response.json({ error: "질문이 비어 있어요." }, { status: 400 });

  const p = body.primary ?? {};
  if (!PROVIDERS.has(p.provider) || typeof p.text !== "string") {
    return Response.json({ error: "첫 답이 없어요." }, { status: 400 });
  }
  const primary: ModelAnswer = {
    provider: p.provider,
    model: clean(p.model, 80),
    ok: true,
    text: clean(p.text, 4000),
    selfConfidence: CONF.has(p.selfConfidence) ? p.selfConfidence : "medium",
    uncertainParts: Array.isArray(p.uncertainParts) ? p.uncertainParts.slice(0, 3).map((u: unknown) => clean(u, 200)) : [],
  };

  const prediction = clean(body.prediction, MAX_FIELD_LEN);
  const priorKnowledge = clean(body.priorKnowledge, MAX_FIELD_LEN);
  const input = await checkInput([question, prediction, priorKnowledge], { childId: auth.child.id, route: "compare" });
  if (!input.ok) return Response.json({ error: input.message, code: "SAFETY" }, { status: 400 });
  try {
    const ctx = newContext(auth.child.id);
    const result = await compareAnswers(question, prediction, priorKnowledge, body.mode === "direct" ? "direct" : "think", primary, ctx);
    const j = result.judge;
    const texts = [
      ...result.answers.filter((a) => a.ok).flatMap((a) => [a.text, ...a.uncertainParts]),
      ...(j ? [j.kidSummary, ...j.differences, ...j.riskyClaims.flatMap((r) => [r.claim, r.why]), ...j.checkTips] : []),
    ];
    if (texts.length > 0 && !(await checkOutput(texts, { ...ctx, route: "compare" }))) {
      const blocked: CompareResult = {
        answers: result.answers.map((a) => ({ ...a, ok: false, text: "", uncertainParts: [], error: "blocked" })),
        judge: null,
        judgeModel: result.judgeModel,
      };
      return Response.json(blocked);
    }
    return Response.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}
