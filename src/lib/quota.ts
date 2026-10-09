import "server-only";
import { and, count, eq, gte } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { Child } from "@/db/schema";

/** 부모가 정하지 않았을 때의 하루 한도. 환경변수로 조정한다. */
export const DAILY_QUESTION_LIMIT = Math.max(1, Number(process.env.DAILY_QUESTION_LIMIT) || 10);
export const DAILY_GAME_LIMIT = Math.max(1, Number(process.env.DAILY_GAME_LIMIT) || 5);
/** 부모가 올릴 수 있는 상한 (비용 보호) */
export const MAX_DAILY_QUESTION_LIMIT = Math.max(DAILY_QUESTION_LIMIT, Number(process.env.MAX_DAILY_QUESTION_LIMIT) || 30);
export const MAX_DAILY_GAME_LIMIT = Math.max(DAILY_GAME_LIMIT, Number(process.env.MAX_DAILY_GAME_LIMIT) || 10);

type ChildLimits = Pick<Child, "id" | "dailyQuestionLimit" | "dailyGameLimit">;

/** 아이에게 적용되는 한도: 부모 설정이 있으면 그것, 없으면 기본값 */
export function limitsFor(child: ChildLimits): { questionLimit: number; gameLimit: number } {
  return {
    questionLimit: child.dailyQuestionLimit ?? DAILY_QUESTION_LIMIT,
    gameLimit: child.dailyGameLimit ?? DAILY_GAME_LIMIT,
  };
}
/** 하루가 바뀌는 기준 시간대. 기본은 한국(UTC+9). */
const RESET_UTC_OFFSET_HOURS = Number(process.env.DAY_RESET_UTC_OFFSET_HOURS ?? 9);

export type Quota = {
  questionsUsed: number;
  questionLimit: number;
  gamesUsed: number;
  gameLimit: number;
  /** 다음 초기화 시각 (UTC Date) */
  resetsAt: Date;
};

/** 기준 시간대의 오늘 0시를 UTC 시각으로 */
export function dayStart(now = new Date()): Date {
  const offsetMs = RESET_UTC_OFFSET_HOURS * 60 * 60 * 1000;
  const local = new Date(now.getTime() + offsetMs);
  const startLocal = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
  return new Date(startLocal - offsetMs);
}

async function usedToday(childId: string, purpose: "think" | "game"): Promise<number> {
  const db = await getDb();
  const [row] = await db
    .select({ n: count() })
    .from(schema.aiUsage)
    .where(and(eq(schema.aiUsage.childId, childId), eq(schema.aiUsage.purpose, purpose), gte(schema.aiUsage.createdAt, dayStart())));
  return Number(row?.n ?? 0);
}

/** 질문은 "생각 단계" 호출을, 게임은 "문제 생성" 호출을 센다. 둘 다 한 번의 시작에 정확히 한 번 일어난다. */
export async function getQuota(child: ChildLimits): Promise<Quota> {
  const [questionsUsed, gamesUsed] = await Promise.all([usedToday(child.id, "think"), usedToday(child.id, "game")]);
  const start = dayStart();
  return {
    questionsUsed,
    gamesUsed,
    ...limitsFor(child),
    resetsAt: new Date(start.getTime() + 24 * 60 * 60 * 1000),
  };
}

export const LIMIT_MESSAGE = {
  question: `오늘 질문은 다 썼어요. 내일 다시 열려요. 궁금한 건 공책에 적어 뒀다가 내일 물어봐요!`,
  game: `오늘 게임은 여기까지예요. 내일 다시 할 수 있어요.`,
};

/**
 * 한도 검사. `starting`이면 새로 시작하는 호출(생각 단계, 게임 생성)이라 "사용 >= 한도"에서 막고,
 * 아니면 이미 시작한 질문의 후속 호출(답, 비교, 정리)이라 "사용 > 한도"에서만 막는다.
 */
export async function checkQuota(child: ChildLimits, kind: "question" | "game", starting: boolean): Promise<Response | null> {
  const q = await getQuota(child);
  const used = kind === "question" ? q.questionsUsed : q.gamesUsed;
  const limit = kind === "question" ? q.questionLimit : q.gameLimit;
  const blocked = starting ? used >= limit : used > limit;
  if (!blocked) return null;
  return Response.json({ error: LIMIT_MESSAGE[kind], code: "LIMIT", quota: q }, { status: 429 });
}
