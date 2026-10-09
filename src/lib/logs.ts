import "server-only";
import { desc, eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { GameResult, QuestionLog } from "@/db/schema";

export async function listQuestionLogs(childId: string, limit = 50): Promise<QuestionLog[]> {
  const db = await getDb();
  return db.query.questionLogs.findMany({
    where: eq(schema.questionLogs.childId, childId),
    orderBy: [desc(schema.questionLogs.createdAt)],
    limit,
  });
}

export async function listGameResults(childId: string, limit = 50): Promise<GameResult[]> {
  const db = await getDb();
  return db.query.gameResults.findMany({
    where: eq(schema.gameResults.childId, childId),
    orderBy: [desc(schema.gameResults.createdAt)],
    limit,
  });
}
