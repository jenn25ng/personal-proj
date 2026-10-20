import "server-only";
import { and, desc, eq, gte, sum } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { Thread } from "@/db/schema";
import { dayStart } from "./quota";

/** 이 시간 안에 마지막 메시지가 있던 스레드는 "하던 주제"로 보고 이어 간다. */
export const THREAD_RESUME_MINUTES = Math.max(1, Number(process.env.THREAD_RESUME_MINUTES) || 30);
/** 한 스레드에서 주고받을 수 있는 최대 턴. 넘으면 새 주제로 센다. */
export const THREAD_TURN_LIMIT = Math.max(5, Number(process.env.THREAD_TURN_LIMIT) || 40);
/** 하루에 생각 단계를 보여 주는 최대 횟수 (안전망) */
export const DAILY_THINK_LIMIT = Math.max(1, Number(process.env.DAILY_THINK_LIMIT) || 5);
/** 요약 길이 상한 (글자). 토큰으로 150 안팎. */
const MEMORY_MAX_CHARS = 400;
const RECENT_TURNS = 3;
const GIST_CHARS = 120;
const LAST_ANSWER_CHARS = 1500;

/** 모델에 넘기는 스레드 문맥. 길이가 고정되도록 자른다. */
export type ThreadContext = {
  memory: string;
  /** 최근 턴. 아이 말은 원문, AI 답은 첫 문장 한 줄 */
  recent: { q: string; a: string }[];
  /** 직전 답 전문. 작업 지시처럼 직전 답을 가리킬 때만 채운다. */
  lastAnswer: string;
  thinkAllowed: boolean;
  firstDirectDone: boolean;
  adultSuggested: boolean;
  turnCount: number;
};

export const EMPTY_CONTEXT: ThreadContext = {
  memory: "",
  recent: [],
  lastAnswer: "",
  thinkAllowed: true,
  firstDirectDone: false,
  adultSuggested: false,
  turnCount: 0,
};

/** 최근에 쓰던 스레드. 없거나 오래됐거나 턴이 다 찼으면 null. */
export async function getRecentThread(childId: string): Promise<Thread | null> {
  const db = await getDb();
  const since = new Date(Date.now() - THREAD_RESUME_MINUTES * 60 * 1000);
  const t = await db.query.threads.findFirst({
    where: and(eq(schema.threads.childId, childId), gte(schema.threads.lastAt, since)),
    orderBy: [desc(schema.threads.lastAt)],
  });
  if (!t || t.turnCount >= THREAD_TURN_LIMIT) return null;
  return t;
}

export async function createThread(childId: string, topicLabel: string): Promise<Thread> {
  const db = await getDb();
  const [t] = await db.insert(schema.threads).values({ childId, topicLabel: topicLabel.slice(0, 60) }).returning();
  return t;
}

/** 오늘 생각 단계를 보여 준 횟수 (오늘 만든 스레드들의 합) */
async function thinkShownToday(childId: string): Promise<number> {
  const db = await getDb();
  const [row] = await db
    .select({ n: sum(schema.threads.thinkCount) })
    .from(schema.threads)
    .where(and(eq(schema.threads.childId, childId), gte(schema.threads.createdAt, dayStart())));
  return Number(row?.n ?? 0);
}

/**
 * 직전 답 전문이 필요한 메시지인지. 모델에게 묻지 않고 규칙으로 정한다 (비용 0).
 * 직전 답을 가리키는 표현이 있거나, 아주 짧은 이어 묻기면 전문을 붙인다.
 */
export function needsLastAnswer(message: string): boolean {
  if (/정리|요약|다시|자세히|쉽게|간단|핵심|맞아|맞지|맞는|검증|확인해|채점|정답|틀렸|틀린|그게|그건|이게|그거|무슨 뜻|뭔 뜻|뜻이|예시|예를|더 /.test(message)) return true;
  return message.length <= 12;
}

function gist(text: string): string {
  const first = text.split(/(?<=[.!?。])\s+/)[0] ?? text;
  return first.slice(0, GIST_CHARS);
}

/** 생각 단계를 보여 줄 수 있는가: 주제당 처음 한 번, 아이가 예상을 적었으면 한 번 더, 하루 상한 안에서 */
export async function thinkAllowedFor(childId: string, thread: Thread | null): Promise<boolean> {
  if (thread) {
    if (thread.thinkOff) return false;
    if (thread.thinkCount >= 2) return false;
    if (thread.thinkCount === 1 && !thread.thinkEngaged) return false;
  }
  return (await thinkShownToday(childId)) < DAILY_THINK_LIMIT;
}

/** 스레드의 기록으로 모델에 넘길 문맥을 만든다. 길이는 항상 상한 안이다. */
export async function buildThreadContext(childId: string, thread: Thread | null, message: string): Promise<ThreadContext> {
  const thinkAllowed = await thinkAllowedFor(childId, thread);
  if (!thread) return { ...EMPTY_CONTEXT, thinkAllowed };
  const db = await getDb();
  const logs = await db.query.questionLogs.findMany({
    where: eq(schema.questionLogs.threadId, thread.id),
    orderBy: [desc(schema.questionLogs.createdAt)],
    limit: RECENT_TURNS,
    columns: { question: true, answers: true },
  });
  const ordered = logs.reverse();
  const recent = ordered.map((l) => ({ q: l.question.slice(0, 200), a: l.answers?.answer.text ? gist(l.answers.answer.text) : "" }));
  const last = ordered[ordered.length - 1];
  const lastAnswer = needsLastAnswer(message) && last?.answers?.answer.text ? last.answers.answer.text.slice(0, LAST_ANSWER_CHARS) : "";
  return {
    memory: thread.memory,
    recent,
    lastAnswer,
    thinkAllowed,
    firstDirectDone: thread.firstDirectDone,
    adultSuggested: thread.adultSuggested,
    turnCount: thread.turnCount,
  };
}

/** 문맥을 프롬프트 문자열로. 비어 있는 항목은 넣지 않는다. */
export function contextToPrompt(ctx: ThreadContext): string {
  const lines: string[] = [];
  lines.push(`대화 요약: ${ctx.memory ? `"""${ctx.memory}"""` : "(없음, 첫 메시지)"}`);
  if (ctx.recent.length > 0) {
    lines.push("최근 턴:");
    for (const t of ctx.recent) lines.push(`- 아이: ${t.q}${t.a ? `\n  AI: ${t.a}` : ""}`);
  }
  if (ctx.lastAnswer) lines.push(`직전 답 전문: """${ctx.lastAnswer}"""`);
  lines.push(`생각 단계 가능: ${ctx.thinkAllowed ? "예" : "아니오"}`);
  lines.push(`되묻기·퍼즐 가능: ${ctx.firstDirectDone ? "아니오" : "예"}`);
  if (ctx.adultSuggested) lines.push("어른 권유: 이미 함");
  return lines.join("\n");
}

export type ThreadUpdate = {
  topicLabel?: string;
  memory?: string;
  turnDelta?: number;
  thinkShown?: boolean;
  thinkEngaged?: boolean;
  thinkOff?: boolean;
  firstDirectDone?: boolean;
  adultSuggested?: boolean;
};

export async function updateThread(thread: Thread, u: ThreadUpdate): Promise<void> {
  const db = await getDb();
  await db
    .update(schema.threads)
    .set({
      ...(u.topicLabel !== undefined && u.topicLabel ? { topicLabel: u.topicLabel.slice(0, 60) } : {}),
      ...(u.memory !== undefined ? { memory: u.memory.slice(0, MEMORY_MAX_CHARS) } : {}),
      turnCount: thread.turnCount + (u.turnDelta ?? 0),
      thinkCount: thread.thinkCount + (u.thinkShown ? 1 : 0),
      ...(u.thinkEngaged !== undefined ? { thinkEngaged: u.thinkEngaged } : {}),
      ...(u.thinkOff !== undefined ? { thinkOff: u.thinkOff } : {}),
      ...(u.firstDirectDone ? { firstDirectDone: true } : {}),
      ...(u.adultSuggested ? { adultSuggested: true } : {}),
      lastAt: new Date(),
    })
    .where(eq(schema.threads.id, thread.id));
}

export async function getThreadForChild(childId: string, threadId: string): Promise<Thread | null> {
  if (!/^[0-9a-f-]{36}$/.test(threadId)) return null;
  const db = await getDb();
  const t = await db.query.threads.findFirst({ where: and(eq(schema.threads.id, threadId), eq(schema.threads.childId, childId)) });
  return t ?? null;
}
