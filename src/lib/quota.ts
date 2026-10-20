import "server-only";
import { and, count, eq, gte } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { Child } from "@/db/schema";

/**
 * 부모가 정하지 않았을 때의 하루 한도. 환경변수로 조정한다.
 * "질문"은 새 주제(스레드)를 센다. 한 주제 안에서 이어 묻는 건 세지 않고, 스레드당 턴 상한(THREAD_TURN_LIMIT)으로 막는다.
 */
export const DAILY_QUESTION_LIMIT = Math.max(1, Number(process.env.DAILY_QUESTION_LIMIT) || 10);
/** 하루 비교 횟수. 비교가 원가의 대부분이라 따로 센다. */
export const DAILY_COMPARE_LIMIT = Math.max(1, Number(process.env.DAILY_COMPARE_LIMIT) || 3);
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
  /** 오늘 적용되는 한도 (기본 또는 부모 설정 + 오늘 추가분) */
  questionLimit: number;
  gamesUsed: number;
  gameLimit: number;
  comparesUsed: number;
  compareLimit: number;
  /** 부모가 오늘만 추가로 열어 준 수 */
  bonusQuestions: number;
  bonusGames: number;
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

/** 기준 시간대의 오늘 날짜 키 (YYYY-MM-DD) */
export function dayKey(now = new Date()): string {
  const offsetMs = RESET_UTC_OFFSET_HOURS * 60 * 60 * 1000;
  return new Date(now.getTime() + offsetMs).toISOString().slice(0, 10);
}

/** 오늘 부모가 추가로 열어 준 수 */
export async function getTodayBonus(childId: string): Promise<{ extraQuestions: number; extraGames: number }> {
  const db = await getDb();
  const row = await db.query.dailyBonuses.findFirst({
    where: and(eq(schema.dailyBonuses.childId, childId), eq(schema.dailyBonuses.day, dayKey())),
  });
  return { extraQuestions: row?.extraQuestions ?? 0, extraGames: row?.extraGames ?? 0 };
}

/**
 * 오늘만 추가로 열어 준다. 같은 날 여러 번 누르면 누적되고, 기본 한도와 합쳐 상한을 넘지 못한다.
 * 돌려주는 값은 적용된 뒤의 오늘 한도.
 */
export async function grantTodayBonus(
  child: ChildLimits,
  extra: { questions: number; games: number },
): Promise<{ ok: true; questionLimit: number; gameLimit: number } | { ok: false; error: string }> {
  const base = limitsFor(child);
  const current = await getTodayBonus(child.id);
  const nextQ = current.extraQuestions + extra.questions;
  const nextG = current.extraGames + extra.games;
  if (base.questionLimit + nextQ > MAX_DAILY_QUESTION_LIMIT) {
    return { ok: false, error: `오늘 질문 한도는 최대 ${MAX_DAILY_QUESTION_LIMIT}개까지만 열 수 있어요.` };
  }
  if (base.gameLimit + nextG > MAX_DAILY_GAME_LIMIT) {
    return { ok: false, error: `오늘 게임 한도는 최대 ${MAX_DAILY_GAME_LIMIT}판까지만 열 수 있어요.` };
  }
  const db = await getDb();
  await db
    .insert(schema.dailyBonuses)
    .values({ childId: child.id, day: dayKey(), extraQuestions: nextQ, extraGames: nextG })
    .onConflictDoUpdate({
      target: [schema.dailyBonuses.childId, schema.dailyBonuses.day],
      set: { extraQuestions: nextQ, extraGames: nextG, updatedAt: new Date() },
    });
  return { ok: true, questionLimit: base.questionLimit + nextQ, gameLimit: base.gameLimit + nextG };
}

async function usedToday(childId: string, purpose: "judge" | "game"): Promise<number> {
  const db = await getDb();
  const [row] = await db
    .select({ n: count() })
    .from(schema.aiUsage)
    .where(and(eq(schema.aiUsage.childId, childId), eq(schema.aiUsage.purpose, purpose), gte(schema.aiUsage.createdAt, dayStart())));
  return Number(row?.n ?? 0);
}

/** 오늘 시작한 스레드(주제) 수 */
async function threadsToday(childId: string): Promise<number> {
  const db = await getDb();
  const [row] = await db
    .select({ n: count() })
    .from(schema.threads)
    .where(and(eq(schema.threads.childId, childId), gte(schema.threads.createdAt, dayStart())));
  return Number(row?.n ?? 0);
}

/** 질문은 오늘 시작한 주제(스레드)를, 게임은 "문제 생성" 호출을, 비교는 "판정" 호출을 센다. */
export async function getQuota(child: ChildLimits): Promise<Quota> {
  const [questionsUsed, gamesUsed, comparesUsed, bonus] = await Promise.all([
    threadsToday(child.id),
    usedToday(child.id, "game"),
    usedToday(child.id, "judge"),
    getTodayBonus(child.id),
  ]);
  const base = limitsFor(child);
  const start = dayStart();
  return {
    questionsUsed,
    gamesUsed,
    comparesUsed,
    compareLimit: DAILY_COMPARE_LIMIT,
    questionLimit: base.questionLimit + bonus.extraQuestions,
    gameLimit: base.gameLimit + bonus.extraGames,
    bonusQuestions: bonus.extraQuestions,
    bonusGames: bonus.extraGames,
    resetsAt: new Date(start.getTime() + 24 * 60 * 60 * 1000),
  };
}

export const LIMIT_MESSAGE = {
  question: `오늘 새 주제는 다 썼어요. 하던 주제는 이어서 물어볼 수 있고, 새 주제는 내일 다시 열려요. 꼭 지금 물어보고 싶으면 부모님께 말해 봐요.`,
  game: `오늘 게임은 여기까지예요. 내일 다시 할 수 있어요. 더 하고 싶으면 부모님께 말해 봐요.`,
  compare: `오늘 다른 AI와 비교하기는 다 썼어요. 내일 다시 할 수 있어요. 대신 교과서나 선생님께 확인해 봐요.`,
};

/**
 * 한도 검사. `starting`이면 새로 시작하는 호출(생각 단계, 게임 생성)이라 "사용 >= 한도"에서 막고,
 * 아니면 이미 시작한 질문의 후속 호출(답, 비교, 정리)이라 "사용 > 한도"에서만 막는다.
 */
export async function checkQuota(child: ChildLimits, kind: "question" | "game" | "compare", starting: boolean): Promise<Response | null> {
  const q = await getQuota(child);
  const used = kind === "question" ? q.questionsUsed : kind === "game" ? q.gamesUsed : q.comparesUsed;
  const limit = kind === "question" ? q.questionLimit : kind === "game" ? q.gameLimit : q.compareLimit;
  const blocked = starting ? used >= limit : used > limit;
  if (!blocked) return null;
  return Response.json({ error: LIMIT_MESSAGE[kind], code: "LIMIT", quota: q }, { status: 429 });
}
