import { askPrimary, compareAnswers, makeGamePuzzle, reflect, thinkFirst } from "@/lib/ai";
import { isAdminRequest } from "@/lib/admin";
import { configuredProviders } from "@/lib/providers";
import { newContext } from "@/lib/usage";
import { getDb, schema } from "@/db";
import { eq } from "drizzle-orm";

export const maxDuration = 300;

/**
 * 실제 API 키로 전체 파이프라인을 한 번 돌려 본다. 아이 계정 없이, 한도에도 들어가지 않는다.
 * POST /api/admin/smoke · Authorization: Bearer <ADMIN_TOKEN>
 */
export async function POST(request: Request) {
  if (!process.env.ADMIN_TOKEN) return Response.json({ error: "ADMIN_TOKEN이 설정되지 않았어요." }, { status: 503 });
  if (!(await isAdminRequest(request))) return Response.json({ error: "권한이 없어요." }, { status: 401 });

  const ctx = newContext();
  const steps: { step: string; ok: boolean; ms: number; detail?: unknown; error?: string }[] = [];
  const run = async <T>(step: string, fn: () => Promise<T>, pick: (v: T) => unknown): Promise<T | null> => {
    const t = performance.now();
    try {
      const v = await fn();
      steps.push({ step, ok: true, ms: Math.round(performance.now() - t), detail: pick(v) });
      return v;
    } catch (err) {
      steps.push({ step, ok: false, ms: Math.round(performance.now() - t), error: err instanceof Error ? err.message : String(err) });
      return null;
    }
  };

  const thinkQ = "달은 왜 모양이 바뀌어요?";
  const directQ = "달까지 거리는 얼마예요?";

  const think = await run("think (생각 질문 분류)", () => thinkFirst(thinkQ, ctx), (v) => ({ mode: v.mode, safe: v.safe, guidingQuestion: v.guidingQuestion }));
  const thinkDirect = await run("think (사실 질문 분류)", () => thinkFirst(directQ, ctx), (v) => ({ mode: v.mode, safe: v.safe }));
  const primary = await run(
    "answer (첫 답, 생각 질문)",
    () => askPrimary(thinkQ, "지구 그림자 때문일 것 같아요", "", "think", ctx),
    (v) => ({ provider: v.answer.provider, model: v.answer.model, ok: v.answer.ok, confidence: v.answer.selfConfidence, text: v.answer.text.slice(0, 160), error: v.answer.error }),
  );
  const direct = await run(
    "answer (첫 답, 사실 질문 + 되묻기·퍼즐)",
    () => askPrimary(directQ, "", "", "direct", ctx),
    (v) => ({ ok: v.answer.ok, text: v.answer.text.slice(0, 160), followUps: v.followUps, puzzles: v.puzzles.length, error: v.answer.error }),
  );
  if (primary?.answer.ok) {
    await run(
      "compare (나머지 모델 + 판정)",
      () => compareAnswers(thinkQ, "지구 그림자 때문일 것 같아요", "", "think", primary.answer, ctx),
      (v) => ({
        answers: v.answers.map((a) => ({ provider: a.provider, model: a.model, ok: a.ok, error: a.error, text: a.text.slice(0, 120) })),
        judge: v.judge ? { agreement: v.judge.agreement, kidSummary: v.judge.kidSummary.slice(0, 160), riskyClaims: v.judge.riskyClaims.length } : null,
        judgeModel: v.judgeModel,
      }),
    );
  }
  await run(
    "reflect (정리 피드백)",
    () => reflect({ question: thinkQ, prediction: "지구 그림자 때문", answerSummary: primary?.answer.text ?? "", reflection: "햇빛 받는 부분이 달라서였다" }, ctx),
    (v) => ({ encouragement: v.encouragement.slice(0, 120), nextQuestion: v.nextQuestion }),
  );
  await run(
    "game (틀린 거 찾기 문제)",
    () => makeGamePuzzle("달과 지구", ctx),
    (v) => ({ safe: v.safe, sentences: v.sentences.length, wrong: v.sentences.filter((s) => s.isWrong).length, lesson: v.lesson.slice(0, 120) }),
  );

  const db = await getDb();
  const usage = await db.query.aiUsage.findMany({ where: eq(schema.aiUsage.requestId, ctx.requestId) });
  const totals = usage.reduce(
    (a, u) => ({ calls: a.calls + 1, input: a.input + u.inputTokens, output: a.output + u.outputTokens, reasoning: a.reasoning + u.reasoningTokens, errors: a.errors + (u.ok ? 0 : 1) }),
    { calls: 0, input: 0, output: 0, reasoning: 0, errors: 0 },
  );

  return Response.json({
    ok: steps.every((s) => s.ok),
    providers: configuredProviders(),
    steps,
    usage: { ...totals, byCall: usage.map((u) => ({ purpose: u.purpose, provider: u.provider, model: u.model, input: u.inputTokens, output: u.outputTokens, ms: u.durationMs, ok: u.ok, error: u.error })) },
    hint: "비용은 /admin 의 AI 호출 비용 표에서 확인하세요. 이 실행은 requestId 하나로 묶여 있어요.",
    requestId: ctx.requestId,
    classified: { think: think?.mode ?? null, direct: thinkDirect?.mode ?? null, directHasFollowUps: (direct?.followUps.length ?? 0) > 0 },
  });
}
