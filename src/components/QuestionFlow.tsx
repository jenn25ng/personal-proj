"use client";

import { useState } from "react";
import { AnswerCard } from "./AnswerCard";
import { AgreementBanner, Button, Spinner, TextArea } from "./ui";
import type { AnswerResult, CompareResult, Puzzle, ReflectResult, ThinkFirstResult } from "@/lib/types";

type Step = "ask" | "think" | "answer" | "reflect" | "done";

async function post<T>(url: string, body: unknown, method = "POST"): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "문제가 생겼어요.");
  return data as T;
}

const EXAMPLES = ["달은 왜 모양이 바뀌어요?", "달까지 거리는 얼마예요?", "비는 왜 내려요?"];

/** AI 쪽 메시지: 작은 아바타 + 본문 (말풍선 없이) */
function AiMsg({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[11px] font-bold text-accent">
        AI
      </span>
      <div className="min-w-0 flex-1 space-y-3 text-[15px] leading-relaxed text-ink">{children}</div>
    </div>
  );
}

/** 아이 쪽 메시지: 오른쪽 말풍선 */
function UserMsg({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-surface px-4 py-2.5 text-[15px] leading-relaxed text-ink">{children}</div>
    </div>
  );
}

function Chip({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-full border border-line bg-bg px-3.5 py-1.5 text-left text-[13px] text-ink hover:bg-surface disabled:opacity-40"
    >
      {children}
    </button>
  );
}

export function QuestionFlow({ questionsLeft, nickname }: { questionsLeft: number; nickname: string }) {
  const [left, setLeft] = useState(questionsLeft);
  const [step, setStep] = useState<Step>("ask");
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [question, setQuestion] = useState("");
  const [draft, setDraft] = useState("");
  const [think, setThink] = useState<ThinkFirstResult | null>(null);
  const [priorKnowledge, setPriorKnowledge] = useState("");
  const [prediction, setPrediction] = useState("");
  const [showHint, setShowHint] = useState(false);

  const [result, setResult] = useState<AnswerResult | null>(null);
  const [comparison, setComparison] = useState<CompareResult | null>(null);
  const [comparing, setComparing] = useState(false);
  const [logId, setLogId] = useState<string | null>(null);

  const [reflection, setReflection] = useState("");
  const [doubted, setDoubted] = useState(false);
  const [feedback, setFeedback] = useState<ReflectResult | null>(null);

  const isDirect = think?.mode === "direct";

  function reset() {
    setStep("ask");
    setError(null);
    setQuestion("");
    setDraft("");
    setThink(null);
    setPriorKnowledge("");
    setPrediction("");
    setShowHint(false);
    setResult(null);
    setComparison(null);
    setComparing(false);
    setLogId(null);
    setReflection("");
    setDoubted(false);
    setFeedback(null);
  }

  async function run<T>(text: string, fn: () => Promise<T>, then: (v: T) => void | Promise<void>) {
    setLoading(true);
    setLoadingText(text);
    setError(null);
    try {
      await then(await fn());
    } catch (e) {
      setError(e instanceof Error ? e.message : "문제가 생겼어요.");
    } finally {
      setLoading(false);
    }
  }

  /** 질문 제출. 바로 답할 질문이면 생각 단계를 건너뛰고 곧장 답을 가져온다. */
  function submitQuestion(text: string) {
    const q = text.trim();
    if (q.length < 2 || loading) return;
    if (step !== "ask") reset();
    setQuestion(q);
    setDraft("");
    return run(
      "질문을 살펴보고 있어요",
      () => post<ThinkFirstResult>("/api/think", { question: q }),
      async (t) => {
        setThink(t);
        setLeft((n) => Math.max(0, n - 1));
        if (!t.safe) return;
        if (t.mode === "think") {
          setStep("think");
          return;
        }
        setLoadingText("답을 찾고 있어요");
        const r = await post<AnswerResult>("/api/answer", { question: q, prediction: "", priorKnowledge: "", mode: "direct" });
        setResult(r);
        setStep("answer");
        post<{ id: string }>("/api/logs/question", {
          question: q,
          mode: "direct",
          topicLabel: t.topicLabel,
          answers: { answer: r.answer, comparison: null },
        })
          .then((saved) => setLogId(saved.id))
          .catch((err) => console.error("기록 저장 실패", err));
      },
    );
  }

  const submitThinking = () =>
    run(
      "답을 찾고 있어요",
      () => post<AnswerResult>("/api/answer", { question, prediction, priorKnowledge }),
      (r) => {
        setResult(r);
        setStep("answer");
      },
    );

  async function compare() {
    if (!result || comparing) return;
    setComparing(true);
    setError(null);
    try {
      const c = await post<CompareResult>("/api/compare", {
        question,
        prediction,
        priorKnowledge,
        mode: think?.mode ?? "think",
        primary: result.answer,
      });
      setComparison(c);
      if (isDirect && logId) {
        post(`/api/logs/question/${logId}`, { comparedModels: true, agreement: c.judge?.agreement ?? null, comparison: c }, "PATCH").catch(
          (err) => console.error("기록 갱신 실패", err),
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "문제가 생겼어요.");
    } finally {
      setComparing(false);
    }
  }

  const submitReflection = () => {
    const answerSummary = comparison?.judge?.kidSummary ?? result?.answer.text.slice(0, 500) ?? "";
    return run(
      "정리하고 있어요",
      () => post<ReflectResult>("/api/reflect", { question, prediction, answerSummary, reflection }),
      (f) => {
        setFeedback(f);
        setStep("done");
        post("/api/logs/question", {
          question,
          mode: "think",
          topicLabel: think?.topicLabel ?? "",
          prediction,
          priorKnowledge,
          usedHint: showHint,
          agreement: comparison?.judge?.agreement ?? null,
          comparedModels: comparison != null,
          reflection,
          doubtedAi: doubted,
          answers: result ? { answer: result.answer, comparison } : null,
        }).catch((err) => console.error("기록 저장 실패", err));
      },
    );
  };

  const primary = result?.answer.ok ? result.answer : undefined;
  const others = comparison?.answers.filter((a) => a.ok) ?? [];
  const failed = comparison?.answers.filter((a) => !a.ok) ?? [];
  const judge = comparison?.judge ?? null;
  const followUps = result?.followUps ?? [];
  const puzzles = result?.puzzles ?? [];
  const canAsk = (step === "ask" && !question) || step === "done" || (think != null && !think.safe) || (isDirect && step === "answer");

  return (
    <div className="flex flex-1 flex-col">
      {/* ---------- 대화 ---------- */}
      <div className="flex-1 space-y-6 py-4">
        {step === "ask" && !question && !loading && (
          <div className="flex flex-col items-start gap-4 py-10">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-ink">{nickname}, 뭐가 궁금해?</h1>
              <p className="mt-1 text-sm text-ink-soft">바로 답을 보기 전에 한 번 생각해 보고, AI 답은 꼭 확인해 봐요.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map((q) => (
                <Chip key={q} onClick={() => submitQuestion(q)}>
                  {q}
                </Chip>
              ))}
            </div>
          </div>
        )}

        {question && <UserMsg>{question}</UserMsg>}

        {loading && step === "ask" && (
          <AiMsg>
            <Spinner text={loadingText} />
          </AiMsg>
        )}

        {/* 부적절한 질문 */}
        {think && !think.safe && (
          <AiMsg>
            <p>{think.redirectMessage}</p>
          </AiMsg>
        )}

        {/* 생각 먼저 */}
        {think?.safe && !isDirect && (
          <>
            <AiMsg>
              <p>
                <span className="font-medium">먼저 생각해 볼까?</span> {think.guidingQuestion}
              </p>
              {step === "think" && (
                <div className="space-y-3 rounded-2xl border border-line p-4">
                  <TextArea label="내가 이미 아는 것, 떠오르는 생각" value={priorKnowledge} onChange={setPriorKnowledge} placeholder="짧아도 괜찮아요." rows={2} />
                  <p className="text-sm text-ink-soft">{think.predictionPrompt}</p>
                  <TextArea label="내 예상 (적어야 답을 볼 수 있어요)" value={prediction} onChange={setPrediction} placeholder="예) 지구 그림자 때문일 것 같아요" rows={2} />
                  {showHint ? (
                    <p className="rounded-xl bg-accent-soft px-3 py-2 text-sm text-ink">힌트: {think.hint}</p>
                  ) : (
                    <button type="button" onClick={() => setShowHint(true)} className="text-[13px] text-accent underline">
                      막혔어요, 힌트 보여 주세요
                    </button>
                  )}
                  <div className="flex items-center gap-3">
                    <Button onClick={submitThinking} disabled={loading || prediction.trim().length < 2}>
                      AI에게 물어보기
                    </Button>
                    {loading && <Spinner text={loadingText} />}
                  </div>
                </div>
              )}
            </AiMsg>
            {step !== "think" && (
              <UserMsg>
                {priorKnowledge && `아는 것: ${priorKnowledge}\n`}
                {`내 예상: ${prediction}`}
              </UserMsg>
            )}
          </>
        )}

        {/* 답 */}
        {result && (
          <AiMsg>
            {isDirect && <p className="text-[13px] text-ink-soft">이건 생각할 것보다 알면 되는 거라 바로 답해요. 그래도 AI 답은 한 번 확인해 봐요.</p>}
            {primary ? (
              <>
                <AnswerCard answer={primary} />

                {!comparison ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <Button variant="secondary" size="sm" onClick={compare} disabled={comparing}>
                      다른 AI는 뭐라고 할까?
                    </Button>
                    {comparing ? <Spinner text="다른 AI들에게 묻고 비교하고 있어요" /> : <span className="text-[12px] text-ink-soft">AI는 가끔 틀린 걸 자신 있게 말해요</span>}
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
                            <span className="font-medium text-bad">틀리기 쉬운 부분:</span>{" "}
                            {judge.riskyClaims.map((r) => `${r.claim} (${r.why})`).join(" / ")}
                          </p>
                        )}
                        <div className="text-sm">
                          <span className="font-medium text-ok">직접 확인하는 방법</span>
                          <ul className="mt-1 list-disc space-y-0.5 pl-5">
                            {judge.checkTips.map((t) => (
                              <li key={t}>{t}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {isDirect && followUps.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[13px] font-medium text-ink-soft">이번엔 내가 물어볼게. 먼저 머릿속으로 찍어 보고 눌러요.</p>
                    <div className="flex flex-wrap gap-2">
                      {followUps.map((q) => (
                        <Chip key={q} onClick={() => submitQuestion(q)} disabled={loading}>
                          {q}
                        </Chip>
                      ))}
                    </div>
                  </div>
                )}
                {isDirect && puzzles.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[13px] font-medium text-ink-soft">이걸로 풀어 보는 문제</p>
                    {puzzles.map((pz, i) => (
                      <PuzzleCard key={i} puzzle={pz} />
                    ))}
                  </div>
                )}
                {loading && isDirect && <Spinner text={loadingText} />}

                {!isDirect && step === "answer" && (
                  <div>
                    <Button variant="secondary" size="sm" onClick={() => setStep("reflect")}>
                      다 읽었어요, 정리하기
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <p className="text-ink-soft">AI들이 지금은 답을 주지 못했어요. 잠시 후 다시 해 봐요.</p>
            )}
          </AiMsg>
        )}

        {/* 정리 */}
        {!isDirect && step === "reflect" && (
          <AiMsg>
            <p>
              <span className="font-medium">한 줄로 정리해 볼까?</span> 오늘 새로 알게 된 것, 또는 내 예상과 달랐던 것을 적어 봐요.
            </p>
            <div className="space-y-3 rounded-2xl border border-line p-4">
              <TextArea label="정리" value={reflection} onChange={setReflection} rows={2} placeholder="예) 그림자가 아니라 햇빛 받는 부분이 달라서였다" />
              <label className="flex items-center gap-2 text-sm text-ink">
                <input type="checkbox" checked={doubted} onChange={(e) => setDoubted(e.target.checked)} className="accent-accent" />
                AI 답 중에 “정말일까?” 싶어서 확인해 보고 싶은 부분이 있었어요
              </label>
              <div className="flex items-center gap-3">
                <Button onClick={submitReflection} disabled={loading || reflection.trim().length < 2}>
                  마무리
                </Button>
                {loading && <Spinner text={loadingText} />}
              </div>
            </div>
          </AiMsg>
        )}
        {step === "done" && feedback && (
          <>
            <UserMsg>{reflection}</UserMsg>
            <AiMsg>
              <p>{feedback.encouragement}</p>
              <p>{feedback.comparison}</p>
              <p>
                <span className="font-medium">확인해 보기:</span> {feedback.verifyTip}
              </p>
              <div className="space-y-2">
                <p className="text-[13px] font-medium text-ink-soft">다음에 궁금해할 만한 것</p>
                <Chip onClick={() => submitQuestion(feedback.nextQuestion)} disabled={loading}>
                  {feedback.nextQuestion}
                </Chip>
              </div>
            </AiMsg>
          </>
        )}

        {error && <p className="rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad">{error}</p>}
      </div>

      {/* ---------- 입력창 ---------- */}
      <div className="sticky bottom-0 bg-gradient-to-t from-bg via-bg to-transparent pb-3 pt-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitQuestion(draft);
          }}
          className="flex items-end gap-2 rounded-2xl border border-line bg-bg p-2 shadow-sm focus-within:border-accent focus-within:ring-2 focus-within:ring-accent-soft"
        >
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                submitQuestion(draft);
              }
            }}
            disabled={!canAsk || loading || left === 0}
            rows={1}
            placeholder={left === 0 ? "오늘 질문은 다 썼어요" : canAsk ? "궁금한 걸 적어 봐요" : "위의 단계를 먼저 끝내요"}
            aria-label="질문"
            className="max-h-40 min-h-[40px] flex-1 resize-none bg-transparent px-2 py-2 text-[15px] leading-relaxed text-ink outline-none placeholder:text-ink-soft/60 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!canAsk || loading || draft.trim().length < 2 || left === 0}
            aria-label="보내기"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-white transition hover:bg-accent-deep disabled:opacity-30"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M8 13V3M8 3L3.5 7.5M8 3l4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </form>
        <p className="mt-1.5 px-2 text-[11px] text-ink-soft">
          {left > 0 ? `오늘 ${left}개 더 물어볼 수 있어요` : "내일 다시 열려요"} · Enter로 보내기, Shift+Enter로 줄바꿈
        </p>
      </div>
    </div>
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
