import { getDb, schema } from "@/db";
import { MAX_FIELD_LEN, MAX_QUESTION_LEN, clean, requireChild } from "@/lib/api-utils";
import { checkInput } from "@/lib/safety";
import type { AnswerLog } from "@/lib/types";

const AGREEMENTS = new Set(["agree", "partly", "disagree"]);

export async function POST(request: Request) {
  const auth = await requireChild();
  if ("response" in auth) return auth.response;
  const body = await request.json().catch(() => ({}));
  const question = clean(body.question, MAX_QUESTION_LEN);
  if (question.length < 2) return Response.json({ error: "질문이 비어 있어요." }, { status: 400 });

  const priorKnowledge = clean(body.priorKnowledge, MAX_FIELD_LEN);
  const prediction = clean(body.prediction, MAX_FIELD_LEN);
  const reflection = clean(body.reflection, MAX_FIELD_LEN);
  const input = await checkInput([question, priorKnowledge, prediction, reflection], { childId: auth.child.id, route: "logs" });
  if (!input.ok) return Response.json({ error: input.message, code: "SAFETY" }, { status: 400 });

  const agreement = typeof body.agreement === "string" && AGREEMENTS.has(body.agreement) ? body.agreement : null;
  const answers = body.answers && typeof body.answers === "object" ? (body.answers as AnswerLog) : null;

  const db = await getDb();
  const [row] = await db
    .insert(schema.questionLogs)
    .values({
      childId: auth.child.id,
      question,
      mode: body.mode === "direct" ? "direct" : "think",
      topicLabel: clean(body.topicLabel, 60),
      priorKnowledge,
      prediction,
      usedHint: body.usedHint === true,
      agreement,
      comparedModels: body.comparedModels === true,
      reflection,
      doubtedAi: body.doubtedAi === true,
      answers,
    })
    .returning({ id: schema.questionLogs.id });
  return Response.json({ id: row.id });
}
