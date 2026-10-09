import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireChild } from "@/lib/api-utils";
import type { AnswerLog, CompareResult } from "@/lib/types";

const AGREEMENTS = new Set(["agree", "partly", "disagree"]);

/** 바로 답한 질문은 답이 오자마자 기록되므로, 비교를 눌렀을 때 비교 결과를 덧붙인다. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireChild();
  if ("response" in auth) return auth.response;
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return Response.json({ error: "잘못된 id" }, { status: 400 });
  const body = await request.json().catch(() => ({}));
  const db = await getDb();
  const where = and(eq(schema.questionLogs.id, id), eq(schema.questionLogs.childId, auth.child.id));
  const existing = await db.query.questionLogs.findFirst({ where, columns: { answers: true } });
  if (!existing) return Response.json({ error: "기록이 없어요." }, { status: 404 });

  const comparison = body.comparison && typeof body.comparison === "object" ? (body.comparison as CompareResult) : null;
  const answers: AnswerLog | null = existing.answers ? { ...existing.answers, comparison: comparison ?? existing.answers.comparison } : null;
  await db
    .update(schema.questionLogs)
    .set({
      comparedModels: body.comparedModels === true,
      agreement: typeof body.agreement === "string" && AGREEMENTS.has(body.agreement) ? body.agreement : null,
      answers,
    })
    .where(where);
  return Response.json({ ok: true });
}
