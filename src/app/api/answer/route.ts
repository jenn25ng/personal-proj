import { getDb, schema } from "@/db";
import { askPrimary } from "@/lib/ai";
import { MAX_FIELD_LEN, MAX_QUESTION_LEN, clean, errorResponse, requireChild } from "@/lib/api-utils";
import { checkInput, checkOutput } from "@/lib/safety";
import { getThreadForChild, updateThread } from "@/lib/threads";
import type { AnswerResult } from "@/lib/types";
import { newContext } from "@/lib/usage";

export const maxDuration = 120;

/**
 * 생각 먼저 질문의 답. 아이가 예상을 적었거나(prediction) 건너뛰었을 때(skipped) 한 번 부른다.
 * 건너뛰면 이 스레드에서는 생각 단계를 다시 걸지 않는다.
 */
export async function POST(request: Request) {
  const auth = await requireChild();
  if ("response" in auth) return auth.response;
  const body = await request.json().catch(() => ({}));
  const question = clean(body.question, MAX_QUESTION_LEN);
  const prediction = clean(body.prediction, MAX_FIELD_LEN);
  const priorKnowledge = clean(body.priorKnowledge, MAX_FIELD_LEN);
  const skipped = body.skipped === true || prediction.length === 0;
  if (question.length < 2) return Response.json({ error: "질문이 비어 있어요." }, { status: 400 });
  const thread = typeof body.threadId === "string" ? await getThreadForChild(auth.child.id, body.threadId) : null;

  const input = await checkInput([question, prediction, priorKnowledge], { childId: auth.child.id, route: "answer" });
  if (!input.ok) return Response.json({ error: input.message, code: "SAFETY" }, { status: 400 });
  try {
    const ctx = newContext(auth.child.id);
    const result = await askPrimary(question, prediction, priorKnowledge, "think", ctx, thread?.memory ?? "");
    let out: AnswerResult = { answer: result.answer, followUps: [], puzzles: [] };
    if (result.answer.ok) {
      const texts = [result.answer.text, ...result.answer.uncertainParts];
      if (!(await checkOutput(texts, { ...ctx, route: "answer" }))) {
        out = { answer: { ...result.answer, ok: false, text: "", uncertainParts: [], error: "blocked" }, followUps: [], puzzles: [] };
      }
    }
    let logId: string | null = null;
    if (out.answer.ok) {
      const db = await getDb();
      const [row] = await db
        .insert(schema.questionLogs)
        .values({
          childId: auth.child.id,
          threadId: thread?.id ?? null,
          question,
          mode: "think",
          topicLabel: clean(body.topicLabel, 60) || thread?.topicLabel || "",
          priorKnowledge,
          prediction,
          usedHint: body.usedHint === true,
          answers: { answer: out.answer, comparison: null },
        })
        .returning({ id: schema.questionLogs.id });
      logId = row.id;
    }
    if (thread) {
      await updateThread(thread, {
        memory: out.answer.ok && result.memory ? result.memory : undefined,
        thinkEngaged: !skipped,
        thinkOff: skipped ? true : undefined,
      });
    }
    return Response.json({ ...out, logId });
  } catch (err) {
    return errorResponse(err, "answer");
  }
}
