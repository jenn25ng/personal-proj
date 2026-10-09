import { and, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { requireChild } from "@/lib/api-utils";

/** 바로 답한 질문은 답이 오자마자 기록되므로, 나중에 "비교해 봤다"만 갱신한다. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireChild();
  if ("response" in auth) return auth.response;
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return Response.json({ error: "잘못된 id" }, { status: 400 });
  const body = await request.json().catch(() => ({}));
  const db = await getDb();
  await db
    .update(schema.questionLogs)
    .set({ comparedModels: body.comparedModels === true })
    .where(and(eq(schema.questionLogs.id, id), eq(schema.questionLogs.childId, auth.child.id)));
  return Response.json({ ok: true });
}
