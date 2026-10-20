import { getDb, schema } from "@/db";
import { respond } from "@/lib/ai";
import { MAX_QUESTION_LEN, clean, errorResponse, requireChild } from "@/lib/api-utils";
import { notifyDistress } from "@/lib/distress";
import { LIMIT_MESSAGE, checkQuota, getQuota } from "@/lib/quota";
import { checkInput, checkOutput } from "@/lib/safety";
import { THREAD_TURN_LIMIT, buildThreadContext, createThread, getRecentThread, updateThread } from "@/lib/threads";
import type { RespondResult } from "@/lib/types";
import { newContext } from "@/lib/usage";

export const maxDuration = 120;

/** 화면이 받는 응답. 모델 결과에 스레드 정보와 기록 id를 붙인다. */
export type MessageResponse = RespondResult & {
  threadId: string | null;
  logId: string | null;
  thread: { topic: string; turnCount: number; turnLimit: number } | null;
  questionsLeft: number;
};

function blocked(redirect: string, care: boolean, questionsLeft: number): MessageResponse {
  return {
    kind: "talk",
    newTopic: false,
    topic: "",
    safe: !care ? false : true,
    care,
    redirect,
    clarify: "",
    guide: "",
    predict: "",
    hint: "",
    answer: null,
    followUps: [],
    puzzles: [],
    suggestCompare: false,
    threadId: null,
    logId: null,
    thread: null,
    questionsLeft,
  };
}

/**
 * 아이의 메시지 하나. 호출 1회로 종류를 판단하고 생각 먼저가 아니면 답까지 낸다.
 * - threadId를 보내지 않으면 최근 30분 안의 스레드를 이어 간다. newThread=true면 새 주제로 시작한다.
 * - 새 주제는 하루 한도를 세고, 이어 묻기는 스레드 턴 상한만 본다.
 */
export async function POST(request: Request) {
  const auth = await requireChild();
  if ("response" in auth) return auth.response;
  const body = await request.json().catch(() => ({}));
  const message = clean(body.message ?? body.question, MAX_QUESTION_LEN);
  if (message.length < 1) return Response.json({ error: "메시지를 적어 주세요." }, { status: 400 });
  const childId = auth.child.id;

  // 입력 필터. 자해 신호는 돌봄 안내 + (부모 설정이 켜져 있으면) 하루 한 번 부모 알림.
  const input = await checkInput([message], { childId, route: "message" });
  if (!input.ok) {
    const q = await getQuota(auth.child);
    const left = Math.max(0, q.questionLimit - q.questionsUsed);
    if (input.category === "selfharm") {
      void notifyDistress(childId);
      return Response.json(blocked(input.message, true, left));
    }
    return Response.json(blocked(input.message, false, left));
  }

  let thread = body.newThread === true ? null : await getRecentThread(childId);
  if (!thread) {
    const limited = await checkQuota(auth.child, "question", true);
    if (limited) return limited;
  }

  try {
    const ctx = newContext(childId);
    const tctx = await buildThreadContext(childId, thread, message);
    const out = await respond(message, tctx, ctx);
    let result = out.result;

    // 출력 필터: 규칙 + 모델. 걸리면 답을 비우고 안내로 바꾼다.
    const texts = [
      result.redirect,
      result.clarify,
      result.guide,
      result.predict,
      result.hint,
      result.answer?.text ?? "",
      ...(result.answer?.uncertainParts ?? []),
      ...result.followUps,
      ...result.puzzles.flatMap((p) => [p.question, p.hint, p.solution]),
    ].filter(Boolean);
    if (texts.length > 0 && !(await checkOutput(texts, { ...ctx, route: "message" }, { model: result.answer != null }))) {
      result = {
        ...result,
        safe: false,
        redirect: "이번 답은 보여 줄 수 없었어요. 다른 말로 다시 물어보거나, 부모님이나 선생님께 물어봐요.",
        clarify: "",
        guide: "",
        predict: "",
        hint: "",
        answer: null,
        followUps: [],
        puzzles: [],
        suggestCompare: false,
      };
    }

    // 스레드 정하기: 새 주제면 새로 연다 (한도 확인). 첫 메시지면 만든다.
    if (thread && result.newTopic) {
      const limited = await checkQuota(auth.child, "question", true);
      if (limited) return Response.json({ error: LIMIT_MESSAGE.question, code: "LIMIT" }, { status: 429 });
      thread = null;
    }
    const created = !thread;
    if (!thread) thread = await createThread(childId, result.topic);

    // 기록: 답이 있을 때만 (생각 먼저는 /api/answer가 기록한다)
    let logId: string | null = null;
    if (result.answer) {
      const db = await getDb();
      const [row] = await db
        .insert(schema.questionLogs)
        .values({
          childId,
          threadId: thread.id,
          question: message,
          mode: result.kind,
          topicLabel: result.topic.slice(0, 60),
          answers: { answer: result.answer, comparison: null },
        })
        .returning({ id: schema.questionLogs.id });
      logId = row.id;
    }

    await updateThread(thread, {
      topicLabel: created || result.newTopic ? result.topic : undefined,
      memory: result.safe && !result.care ? out.memory : undefined,
      turnDelta: 1,
      thinkShown: result.kind === "think",
      thinkEngaged: result.kind === "think" ? false : undefined,
      firstDirectDone: result.kind === "direct" && result.answer != null,
      adultSuggested: out.suggestedAdult,
    });

    const q = await getQuota(auth.child);
    const res: MessageResponse = {
      ...result,
      threadId: thread.id,
      logId,
      thread: { topic: thread.topicLabel || result.topic, turnCount: thread.turnCount + 1, turnLimit: THREAD_TURN_LIMIT },
      questionsLeft: Math.max(0, q.questionLimit - q.questionsUsed),
    };
    return Response.json(res);
  } catch (err) {
    return errorResponse(err, "message");
  }
}
