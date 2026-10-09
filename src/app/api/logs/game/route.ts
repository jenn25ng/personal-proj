import { getDb, schema } from "@/db";
import { clean, requireChild } from "@/lib/api-utils";
import type { GamePuzzle } from "@/lib/types";

function int(v: unknown, max = 20): number {
  const n = Number(v);
  return Number.isInteger(n) && n >= 0 && n <= max ? n : 0;
}

export async function POST(request: Request) {
  const auth = await requireChild();
  if ("response" in auth) return auth.response;
  const body = await request.json().catch(() => ({}));
  const topic = clean(body.topic, 60);
  if (topic.length < 1) return Response.json({ error: "주제가 비어 있어요." }, { status: 400 });

  const db = await getDb();
  const [row] = await db
    .insert(schema.gameResults)
    .values({
      childId: auth.child.id,
      topic,
      wrongCount: int(body.wrongCount),
      found: int(body.found),
      falseAlarms: int(body.falseAlarms),
      puzzle: body.puzzle && typeof body.puzzle === "object" ? (body.puzzle as GamePuzzle) : null,
    })
    .returning({ id: schema.gameResults.id });
  return Response.json({ id: row.id });
}
