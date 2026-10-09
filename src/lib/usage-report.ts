import "server-only";
import { and, gte, lt } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { estimateUsd, priceFor } from "./pricing";

export type Agg = {
  calls: number;
  errors: number;
  inputTokens: number;
  cacheReadTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  usd: number;
  unpriced: number;
  durationMs: number;
};

export type UsageReport = {
  since: Date;
  until: Date;
  days: number;
  totals: Agg;
  perQuestion: { questions: number; usd: number | null };
  perGame: { games: number; usd: number | null };
  byPurposeModel: (Agg & { purpose: string; provider: string; model: string; usdPerCall: number; avgMs: number; priced: boolean })[];
  byDay: { day: string; calls: number; usd: number }[];
};

const empty = (): Agg => ({ calls: 0, errors: 0, inputTokens: 0, cacheReadTokens: 0, outputTokens: 0, reasoningTokens: 0, usd: 0, unpriced: 0, durationMs: 0 });
const round = (n: number) => Math.round(n * 1_000_000) / 1_000_000;

/** 최근 days일의 AI 호출을 용도·모델·날짜별로 집계하고 비용을 추정한다. */
export async function buildUsageReport(days: number): Promise<UsageReport> {
  const until = new Date();
  const since = new Date(until.getTime() - days * 24 * 60 * 60 * 1000);
  const db = await getDb();

  const rows = await db.query.aiUsage.findMany({
    where: and(gte(schema.aiUsage.createdAt, since), lt(schema.aiUsage.createdAt, until)),
    limit: 100_000,
  });
  const questions = (
    await db.query.questionLogs.findMany({
      where: and(gte(schema.questionLogs.createdAt, since), lt(schema.questionLogs.createdAt, until)),
      columns: { id: true },
    })
  ).length;
  const games = (
    await db.query.gameResults.findMany({
      where: and(gte(schema.gameResults.createdAt, since), lt(schema.gameResults.createdAt, until)),
      columns: { id: true },
    })
  ).length;

  const add = (a: Agg, r: (typeof rows)[number]) => {
    a.calls += 1;
    if (!r.ok) a.errors += 1;
    a.inputTokens += r.inputTokens;
    a.cacheReadTokens += r.cacheReadTokens;
    a.outputTokens += r.outputTokens;
    a.reasoningTokens += r.reasoningTokens;
    a.durationMs += r.durationMs;
    const usd = estimateUsd(r.model, r);
    if (usd == null) a.unpriced += 1;
    else a.usd += usd;
  };

  const totals = empty();
  const byKey = new Map<string, Agg & { purpose: string; provider: string; model: string }>();
  const byDay = new Map<string, Agg>();
  const byPurpose = new Map<string, Agg>();
  for (const r of rows) {
    add(totals, r);
    const key = `${r.purpose}|${r.provider}|${r.model}`;
    if (!byKey.has(key)) byKey.set(key, { ...empty(), purpose: r.purpose, provider: r.provider, model: r.model });
    add(byKey.get(key)!, r);
    const day = r.createdAt.toISOString().slice(0, 10);
    if (!byDay.has(day)) byDay.set(day, empty());
    add(byDay.get(day)!, r);
    if (!byPurpose.has(r.purpose)) byPurpose.set(r.purpose, empty());
    add(byPurpose.get(r.purpose)!, r);
  }

  const questionUsd = ["think", "answer", "judge", "reflect"].reduce((s, p) => s + (byPurpose.get(p)?.usd ?? 0), 0);
  const gameUsd = byPurpose.get("game")?.usd ?? 0;

  return {
    since,
    until,
    days,
    totals: { ...totals, usd: round(totals.usd) },
    perQuestion: { questions, usd: questions ? round(questionUsd / questions) : null },
    perGame: { games, usd: games ? round(gameUsd / games) : null },
    byPurposeModel: [...byKey.values()]
      .map((a) => ({
        ...a,
        usd: round(a.usd),
        usdPerCall: a.calls ? round(a.usd / a.calls) : 0,
        avgMs: a.calls ? Math.round(a.durationMs / a.calls) : 0,
        priced: priceFor(a.model) != null,
      }))
      .sort((x, y) => y.usd - x.usd),
    byDay: [...byDay.entries()].sort().map(([day, a]) => ({ day, calls: a.calls, usd: round(a.usd) })),
  };
}

/** 관리자 화면 상단의 현황 숫자 */
export async function buildOverview() {
  const db = await getDb();
  const [parents, kids, questions, games] = await Promise.all([
    db.query.parents.findMany({ columns: { id: true, emailVerifiedAt: true } }),
    db.query.children.findMany({ columns: { id: true } }),
    db.query.questionLogs.findMany({ columns: { id: true, mode: true } }),
    db.query.gameResults.findMany({ columns: { id: true } }),
  ]);
  return {
    parents: parents.length,
    verifiedParents: parents.filter((p) => p.emailVerifiedAt).length,
    children: kids.length,
    questions: questions.length,
    directQuestions: questions.filter((q) => q.mode === "direct").length,
    games: games.length,
  };
}
