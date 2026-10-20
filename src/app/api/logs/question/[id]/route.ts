import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { MAX_FIELD_LEN, clean, requireChild } from "@/lib/api-utils";
import type { AnswerLog, CompareResult } from "@/lib/types";

const AGREEMENTS = new Set(["agree", "partly", "disagree"]);

/** 답이 오자마자 서버가 기록하므로, 비교·정리는 나중에 덧붙인다. */
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
  const set: Partial<typeof schema.questionLogs.$inferInsert> = {};
  if (comparison) {
    set.comparedModels = true;
    set.agreement = typeof body.agreement === "string" && AGREEMENTS.has(body.agreement) ? body.agreement : null;
    set.answers = answers;
  }
  if (typeof body.reflection === "string") set.reflection = clean(body.reflection, MAX_FIELD_LEN);
  if (typeof body.doubtedAi === "boolean") set.doubtedAi = body.doubtedAi;
  if (Object.keys(set).length === 0) return Response.json({ ok: true });
  await db.update(schema.questionLogs).set(set).where(where);
  return Response.json({ ok: true });
}
