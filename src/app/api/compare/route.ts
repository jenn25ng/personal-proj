import { checkQuota } from "@/lib/quota";
import { compareAnswers } from "@/lib/ai";
import { MAX_FIELD_LEN, MAX_QUESTION_LEN, clean, errorResponse, requireChild } from "@/lib/api-utils";
import type { ModelAnswer } from "@/lib/types";
import { newContext } from "@/lib/usage";

export const maxDuration = 120;

const PROVIDERS = new Set(["claude", "gemini", "chatgpt"]);
const CONF = new Set(["high", "medium", "low"]);

/** 버튼을 눌렀을 때만 나머지 모델을 부른다. 첫 답은 클라이언트가 그대로 돌려보낸다. */
export async function POST(request: Request) {
  const auth = await requireChild();
  if ("response" in auth) return auth.response;
  const limited = await checkQuota(auth.child.id, "question", false);
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

  try {
    return Response.json(
      await compareAnswers(
        question,
        clean(body.prediction, MAX_FIELD_LEN),
        clean(body.priorKnowledge, MAX_FIELD_LEN),
        body.mode === "direct" ? "direct" : "think",
        primary,
        newContext(auth.child.id),
      ),
    );
  } catch (err) {
    return errorResponse(err);
  }
}
