"use client";

import { useState } from "react";
import { AnswerCard } from "./AnswerCard";
import { AiMsg, Chip, Composer, UserMsg } from "./chat";
import { AgreementBanner, Button, Spinner, TextArea } from "./ui";
import type { MessageResponse } from "@/app/api/message/route";
import type { AnswerResult, CompareResult, Puzzle, ReflectResult } from "@/lib/types";

async function post<T>(url: string, body: unknown, method = "POST"): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error ?? "문제가 생겼어요.") as Error & { code?: string };
    err.code = data.code;
    throw err;
  }
  return data as T;
}

const EXAMPLES = ["달은 왜 모양이 바뀌어요?", "달까지 거리는 얼마예요?", "비는 왜 내려요?"];

type Step = "loading" | "think" | "answer" | "reflect" | "done";

/** 대화의 한 턴. 아이의 메시지 하나와 그에 대한 모든 것. */
type Turn = {
  id: number;
  question: string;
  res?: MessageResponse;
  priorKnowledge: string;
  prediction: string;
  showHint: boolean;
  skipped: boolean;
  /** 생각 먼저 질문의 답 (/api/answer) */
  answer?: AnswerResult & { logId: string | null };
  comparison?: CompareResult | null;
  comparing?: boolean;
  reflection: string;
  doubted: boolean;
  feedback?: ReflectResult;
  step: Step;
  error?: string;
};

export type ActiveThread = { id: string; topic: string; turnCount: number } | null;

export function QuestionFlow({
  questionsLeft,
  comparesLeft,
  nickname,
  activeThread,
  turnLimit,
}: {
  questionsLeft: number;
  comparesLeft: number;
  nickname: string;
  activeThread: ActiveThread;
  turnLimit: number;
}) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [left, setLeft] = useState(questionsLeft);
  const [compares, setCompares] = useState(comparesLeft);
  const [thread, setThread] = useState<ActiveThread>(activeThread);
  const [newThreadPending, setNewThreadPending] = useState(false);
  const [seq, setSeq] = useState(0);

  function patch(id: number, p: Partial<Turn> | ((t: Turn) => Partial<Turn>)) {
    setTurns((ts) => ts.map((t) => (t.id === id ? { ...t, ...(typeof p === "function" ? p(t) : p) } : t)));
  }

  const last = turns[turns.length - 1];
  const pendingThink = last?.step === "think";
  const canAsk = !loading && !pendingThink && (left > 0 || (thread != null && !newThreadPending));

  /** 메시지 하나 보내기. 호출 1회로 종류와 답이 온다. */
  async function send(text: string) {
    const q = text.trim();
    if (q.length < 1 || !canAsk) return;
    const id = seq + 1;
    setSeq(id);
    setDraft("");
    setLoading(true);
    const startNew = newThreadPending || thread == null;
    setNewThreadPending(false);
    setTurns((ts) => [...ts, { id, question: q, priorKnowledge: "", prediction: "", showHint: false, skipped: false, reflection: "", doubted: false, step: "loading" }]);
    try {
      const res = await post<MessageResponse>("/api/message", { message: q, newThread: newThreadPending });
      if (res.threadId) setThread({ id: res.threadId, topic: res.thread?.topic ?? "", turnCount: res.thread?.turnCount ?? 1 });
      setLeft(res.questionsLeft);
      const pending = res.safe && !res.care && !res.clarify && res.kind === "think";
      patch(id, { res, step: pending ? "think" : "answer" });
    } catch (e) {
      const err = e as Error & { code?: string };
      patch(id, { step: "answer", error: err.message });
      if (err.code === "LIMIT" && startNew) setLeft(0);
    } finally {
      setLoading(false);
    }
  }

  /** 생각 먼저: 예상을 적었거나 건너뛰었을 때 답을 가져온다. */
  async function submitThinking(t: Turn, skipped: boolean) {
    setLoading(true);
    patch(t.id, { skipped, error: undefined });
    try {
      const r = await post<AnswerResult & { logId: string | null }>("/api/answer", {
        threadId: thread?.id,
        question: t.question,
        prediction: skipped ? "" : t.prediction,
        priorKnowledge: t.priorKnowledge,
        usedHint: t.showHint,
        topicLabel: t.res?.topic ?? "",
        skipped,
      });
      patch(t.id, { answer: r, step: "answer" });
    } catch (e) {
      patch(t.id, { error: (e as Error).message });
    } finally {
      setLoading(false);
    }
  }

  function primaryOf(t: Turn) {
    return t.answer?.answer.ok ? t.answer.answer : t.res?.answer ?? null;
  }
  function logIdOf(t: Turn) {
    return t.answer?.logId ?? t.res?.logId ?? null;
  }

  async function compare(t: Turn) {
    const primary = primaryOf(t);
    if (!primary || t.comparing) return;
    patch(t.id, { comparing: true, error: undefined });
    try {
      const c = await post<CompareResult>("/api/compare", {
        threadId: thread?.id,
        question: t.question,
        prediction: t.prediction,
        priorKnowledge: t.priorKnowledge,
        mode: t.res?.kind ?? "direct",
        primary,
      });
      patch(t.id, { comparison: c });
      setCompares((n) => Math.max(0, n - 1));
      const logId = logIdOf(t);
      if (logId) {
        post(`/api/logs/question/${logId}`, { comparedModels: true, agreement: c.judge?.agreement ?? null, comparison: c }, "PATCH").catch((err) =>
          console.error("기록 갱신 실패", err),
        );
      }
    } catch (e) {
      const err = e as Error & { code?: string };
      patch(t.id, { error: err.message });
      if (err.code === "LIMIT") setCompares(0);
    } finally {
      patch(t.id, { comparing: false });
    }
  }

  async function submitReflection(t: Turn) {
    const primary = primaryOf(t);
    const answerSummary = t.comparison?.judge?.kidSummary ?? primary?.text.slice(0, 500) ?? "";
    setLoading(true);
    try {
      const f = await post<ReflectResult>("/api/reflect", { question: t.question, prediction: t.prediction, answerSummary, reflection: t.reflection });
      patch(t.id, { feedback: f, step: "done" });
      const logId = logIdOf(t);
      if (logId) post(`/api/logs/question/${logId}`, { reflection: t.reflection, doubtedAi: t.doubted }, "PATCH").catch((err) => console.error("기록 갱신 실패", err));
    } catch (e) {
      patch(t.id, { error: (e as Error).message });
    } finally {
      setLoading(false);
    }
  }

  function startNewTopic() {
    setTurns([]);
    setThread(null);
    setNewThreadPending(true);
  }

  const turnCount = thread?.turnCount ?? 0;
  const hint =
    left > 0
      ? `오늘 새 주제 ${left}개 더${thread ? ` · 이 주제 ${turnCount}/${turnLimit}` : ""}`
      : thread
        ? `오늘 새 주제는 다 썼어요 · 이 주제는 ${turnLimit - turnCount}번 더 이어서 물어볼 수 있어요`
        : "오늘 새 주제는 다 썼어요. 내일 다시 열려요";

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex-1 space-y-6 py-4">
        {turns.length === 0 && !loading && (
          <div className="flex flex-col items-start gap-4 py-10">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-ink">{nickname}, 뭐가 궁금해?</h1>
              <p className="mt-1 text-sm text-ink-soft">AI 답은 꼭 확인해 봐요. 궁금한 게 생기면 이어서 물어봐도 돼요.</p>
            </div>
            {thread && !newThreadPending ? (
              <div className="flex flex-wrap items-center gap-2 text-[13px] text-ink-soft">
                <span>
                  아까 하던 <span className="text-ink">“{thread.topic || "주제"}”</span>에 이어서 물어볼 수 있어요.
                </span>
                <button type="button" onClick={startNewTopic} className="text-accent hover:underline">
                  새 주제로 시작
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {EXAMPLES.map((q) => (
                  <Chip key={q} onClick={() => send(q)}>
                    {q}
                  </Chip>
                ))}
              </div>
            )}
          </div>
        )}

        {turns.length > 0 && thread && (
          <div className="flex items-center justify-between gap-3 text-[12px] text-ink-soft">
            <span className="truncate">
              주제 · <span className="text-ink">{thread.topic || "…"}</span>
            </span>
            <button type="button" onClick={startNewTopic} disabled={loading || pendingThink} className="shrink-0 hover:text-ink hover:underline disabled:opacity-40">
              새 주제
            </button>
          </div>
        )}

        {turns.map((t) => (
          <TurnView
            key={t.id}
            t={t}
            loading={loading}
            comparesLeft={compares}
            onPatch={(p) => patch(t.id, p)}
            onThink={(skipped) => submitThinking(t, skipped)}
            onCompare={() => compare(t)}
            onReflect={() => submitReflection(t)}
            onAsk={(q) => send(q)}
          />
        ))}
      </div>

      <Composer
        value={draft}
        onChange={setDraft}
        onSubmit={() => send(draft)}
        disabled={!canAsk}
        minLength={1}
        placeholder={pendingThink ? "먼저 위에서 예상을 적거나 건너뛰어요" : canAsk ? (turns.length ? "이어서 물어봐요" : "궁금한 걸 적어 봐요") : "오늘 새 주제는 다 썼어요"}
        hint={`${hint} · Enter로 보내기, Shift+Enter로 줄바꿈`}
      />
    </div>
  );
}

function TurnView({
  t,
  loading,
  comparesLeft,
  onPatch,
  onThink,
  onCompare,
  onReflect,
  onAsk,
}: {
  t: Turn;
  loading: boolean;
  comparesLeft: number;
  onPatch: (p: Partial<Turn>) => void;
  onThink: (skipped: boolean) => void;
  onCompare: () => void;
  onReflect: () => void;
  onAsk: (q: string) => void;
}) {
  const r = t.res;
  const isThink = r?.kind === "think" && r.safe && !r.care && !r.clarify;
  const primary = t.answer?.answer.ok ? t.answer.answer : r?.answer ?? null;
  const others = t.comparison?.answers.filter((a) => a.ok) ?? [];
  const failed = t.comparison?.answers.filter((a) => !a.ok) ?? [];
  const judge = t.comparison?.judge ?? null;

  return (
    <>
      <UserMsg>{t.question}</UserMsg>

      {t.step === "loading" && (
        <AiMsg>
          <Spinner text="읽고 있어요" />
        </AiMsg>
      )}

      {r && (!r.safe || r.care) && (
        <AiMsg>
          <p>{r.redirect}</p>
        </AiMsg>
      )}

      {r && r.safe && !r.care && r.clarify && (
        <AiMsg>
          <p>{r.clarify}</p>
        </AiMsg>
      )}

      {isThink && r && (
        <>
          <AiMsg>
            <p>
              <span className="font-medium">먼저 생각해 볼까?</span> {r.guide}
            </p>
            {t.step === "think" && (
              <div className="space-y-3 rounded-2xl border border-line p-4">
                <TextArea label="내가 이미 아는 것, 떠오르는 생각" value={t.priorKnowledge} onChange={(v) => onPatch({ priorKnowledge: v })} placeholder="짧아도 괜찮아요." rows={2} />
                <p className="text-sm text-ink-soft">{r.predict}</p>
                <TextArea label="내 예상" value={t.prediction} onChange={(v) => onPatch({ prediction: v })} placeholder="예) 지구 그림자 때문일 것 같아요" rows={2} />
                {t.showHint ? (
                  <p className="rounded-xl bg-accent-soft px-3 py-2 text-sm text-ink">힌트: {r.hint}</p>
                ) : (
                  <button type="button" onClick={() => onPatch({ showHint: true })} className="text-[13px] text-accent underline">
                    막혔어요, 힌트 보여 주세요
                  </button>
                )}
                <div className="flex flex-wrap items-center gap-3">
                  <Button onClick={() => onThink(false)} disabled={loading || t.prediction.trim().length < 2}>
                    AI에게 물어보기
                  </Button>
                  <button type="button" onClick={() => onThink(true)} disabled={loading} className="text-[13px] text-ink-soft hover:text-ink hover:underline disabled:opacity-40">
                    이번엔 그냥 답 볼래요
                  </button>
                  {loading && <Spinner text="답을 찾고 있어요" />}
                </div>
              </div>
            )}
          </AiMsg>
          {t.step !== "think" && (
            <UserMsg>
              {t.priorKnowledge && `아는 것: ${t.priorKnowledge}\n`}
              {t.skipped ? "이번엔 그냥 답 볼래요" : `내 예상: ${t.prediction}`}
            </UserMsg>
          )}
        </>
      )}

      {r && r.safe && !r.care && !r.clarify && (primary || (isThink && t.step !== "think" && t.answer)) && (
        <AiMsg>
          {primary ? (
            <>
              {r.kind === "talk" ? <p className="whitespace-pre-wrap">{primary.text}</p> : <AnswerCard answer={primary} />}

              {r.kind !== "talk" &&
                (!t.comparison ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <Button variant={r.suggestCompare ? "primary" : "secondary"} size="sm" onClick={onCompare} disabled={t.comparing || comparesLeft === 0}>
                      {r.suggestCompare ? "다른 AI한테도 물어볼까?" : "다른 AI는 뭐라고 할까?"}
                    </Button>
                    {t.comparing ? (
                      <Spinner text="다른 AI들에게 묻고 비교하고 있어요" />
                    ) : (
                      <span className="text-[12px] text-ink-soft">{comparesLeft === 0 ? "오늘 비교는 다 썼어요" : `AI는 가끔 틀린 걸 자신 있게 말해요 · 오늘 ${comparesLeft}번 더`}</span>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-[13px] font-medium text-ink-soft">다른 AI의 답</p>
                    {others.length === 0 && failed.length === 0 && <p className="text-[13px] text-ink-soft">지금은 비교할 다른 AI가 없어요.</p>}
                    {others.map((a) => (
                      <AnswerCard key={a.provider} answer={a} compact />
                    ))}
                    {failed.map((a) => (
                      <AnswerCard key={a.provider} answer={a} compact />
                    ))}
                    {judge && (
                      <div className="space-y-2.5 rounded-2xl border border-line p-4">
                        <AgreementBanner agreement={judge.agreement} />
                        <p>{judge.kidSummary}</p>
                        {judge.differences.length > 0 && (
                          <p className="text-sm">
                            <span className="font-medium">서로 달랐던 점:</span> {judge.differences.join(" / ")}
                          </p>
                        )}
                        {judge.riskyClaims.length > 0 && (
                          <p className="text-sm">
                            <span className="font-medium text-bad">틀리기 쉬운 부분:</span> {judge.riskyClaims.map((x) => `${x.claim} (${x.why})`).join(" / ")}
                          </p>
                        )}
                        <div className="text-sm">
                          <span className="font-medium text-ok">직접 확인하는 방법</span>
                          <ul className="mt-1 list-disc space-y-0.5 pl-5">
                            {judge.checkTips.map((tip) => (
                              <li key={tip}>{tip}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

              {r.followUps.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[13px] font-medium text-ink-soft">이번엔 내가 물어볼게. 먼저 머릿속으로 찍어 보고 눌러요.</p>
                  <div className="flex flex-wrap gap-2">
                    {r.followUps.map((q) => (
                      <Chip key={q} onClick={() => onAsk(q)} disabled={loading}>
                        {q}
                      </Chip>
                    ))}
                  </div>
                </div>
              )}
              {r.puzzles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[13px] font-medium text-ink-soft">이걸로 풀어 보는 문제</p>
                  {r.puzzles.map((pz, i) => (
                    <PuzzleCard key={i} puzzle={pz} />
                  ))}
                </div>
              )}

              {isThink && t.step === "answer" && (
                <div>
                  <Button variant="secondary" size="sm" onClick={() => onPatch({ step: "reflect" })}>
                    다 읽었어요, 정리하기
                  </Button>
                </div>
              )}
            </>
          ) : (
            <p className="text-ink-soft">AI가 지금은 답을 주지 못했어요. 잠시 후 다시 해 봐요.</p>
          )}
        </AiMsg>
      )}

      {isThink && t.step === "reflect" && (
        <AiMsg>
          <p>
            <span className="font-medium">한 줄로 정리해 볼까?</span> 오늘 새로 알게 된 것, 또는 내 예상과 달랐던 것을 적어 봐요.
          </p>
          <div className="space-y-3 rounded-2xl border border-line p-4">
            <TextArea label="정리" value={t.reflection} onChange={(v) => onPatch({ reflection: v })} rows={2} placeholder="예) 그림자가 아니라 햇빛 받는 부분이 달라서였다" />
            <label className="flex items-center gap-2 text-sm text-ink">
              <input type="checkbox" checked={t.doubted} onChange={(e) => onPatch({ doubted: e.target.checked })} className="accent-accent" />
              AI 답 중에 “정말일까?” 싶어서 확인해 보고 싶은 부분이 있었어요
            </label>
            <div className="flex items-center gap-3">
              <Button onClick={onReflect} disabled={loading || t.reflection.trim().length < 2}>
                마무리
              </Button>
              {loading && <Spinner text="정리하고 있어요" />}
            </div>
          </div>
        </AiMsg>
      )}
      {t.step === "done" && t.feedback && (
        <>
          <UserMsg>{t.reflection}</UserMsg>
          <AiMsg>
            <p>{t.feedback.encouragement}</p>
            <p>{t.feedback.comparison}</p>
            <p>
              <span className="font-medium">확인해 보기:</span> {t.feedback.verifyTip}
            </p>
            <div className="space-y-2">
              <p className="text-[13px] font-medium text-ink-soft">다음에 궁금해할 만한 것</p>
              <Chip onClick={() => onAsk(t.feedback!.nextQuestion)} disabled={loading}>
                {t.feedback.nextQuestion}
              </Chip>
            </div>
          </AiMsg>
        </>
      )}

      {t.error && <p className="rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad">{t.error}</p>}
    </>
  );
}

/** 추론 문제 하나. 아이가 답을 적어야 풀이가 열린다. */
function PuzzleCard({ puzzle }: { puzzle: Puzzle }) {
  const [attempt, setAttempt] = useState("");
  const [hint, setHint] = useState(false);
  const [revealed, setRevealed] = useState(false);
  return (
    <div className="rounded-xl border border-line p-3">
      <p className="text-sm leading-relaxed text-ink">{puzzle.question}</p>
      <div className="mt-2 flex gap-2">
        <input
          value={attempt}
          onChange={(e) => setAttempt(e.target.value)}
          disabled={revealed}
          placeholder="내 답 (어림해도 괜찮아요)"
          aria-label="내 답"
          className="min-w-0 flex-1 rounded-lg border border-line bg-bg px-3 py-1.5 text-sm text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft disabled:bg-surface"
        />
        {!revealed && (
          <Button size="sm" onClick={() => setRevealed(true)} disabled={attempt.trim().length < 1}>
            풀이 보기
          </Button>
        )}
      </div>
      {!revealed &&
        (hint ? (
          <p className="mt-2 text-[13px] text-ink-soft">힌트: {puzzle.hint}</p>
        ) : (
          <button type="button" onClick={() => setHint(true)} className="mt-2 text-[13px] text-accent underline">
            힌트 보기
          </button>
        ))}
      {revealed && (
        <div className="mt-2 space-y-1 text-sm">
          <p className="text-ink-soft">
            내 답: <span className="font-medium text-ink">{attempt}</span>
          </p>
          <p className="rounded-lg bg-ok-soft px-3 py-2 leading-relaxed text-ink">{puzzle.solution}</p>
          <p className="text-[12px] text-ink-soft">딱 맞지 않아도 괜찮아요. 어림하는 방법을 떠올린 게 진짜예요.</p>
        </div>
      )}
    </div>
  );
}
