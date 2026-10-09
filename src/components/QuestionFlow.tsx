"use client";

import { useState } from "react";
import { AnswerCard } from "./AnswerCard";
import { AgreementBanner, Button, Card, Spinner, StepTitle, TextArea } from "./ui";
import type { AnswerResult, Puzzle, ReflectResult, ThinkFirstResult } from "@/lib/types";

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

export function QuestionFlow() {
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
  const [compared, setCompared] = useState(false);
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
    setCompared(false);
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
    if (q.length < 2) return;
    setQuestion(q);
    return run(
      "질문을 살펴보고 있어요",
      () => post<ThinkFirstResult>("/api/think", { question: q }),
      async (t) => {
        setThink(t);
        if (!t.safe) return;
        if (t.mode === "think") {
          setStep("think");
          return;
        }
        setLoadingText("AI 세 개에게 동시에 묻고 있어요");
        const r = await post<AnswerResult>("/api/answer", { question: q, prediction: "", priorKnowledge: "", mode: "direct" });
        setResult(r);
        setStep("answer");
        // 바로 답한 질문은 지금 기록한다. 실패해도 아이에게는 알리지 않는다.
        post<{ id: string }>("/api/logs/question", {
          question: q,
          mode: "direct",
          topicLabel: t.topicLabel,
          agreement: r.judge?.agreement ?? null,
          answers: r,
        })
          .then((saved) => setLogId(saved.id))
          .catch((err) => console.error("기록 저장 실패", err));
      },
    );
  }

  const submitThinking = () =>
    run(
      "AI 세 개에게 동시에 묻고 있어요",
      () => post<AnswerResult>("/api/answer", { question, prediction, priorKnowledge }),
      (r) => {
        setResult(r);
        setStep("answer");
      },
    );

  function compare() {
    setCompared(true);
    if (isDirect && logId) {
      post(`/api/logs/question/${logId}`, { comparedModels: true }, "PATCH").catch((err) =>
        console.error("기록 갱신 실패", err),
      );
    }
  }

  const submitReflection = () => {
    const answerSummary =
      result?.judge?.kidSummary ?? result?.answers.find((a) => a.ok)?.text.slice(0, 500) ?? "";
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
          agreement: result?.judge?.agreement ?? null,
          comparedModels: compared,
          reflection,
          doubtedAi: doubted,
          answers: result,
        }).catch((err) => console.error("기록 저장 실패", err));
      },
    );
  };

  /** "더 궁금해질 만한 것"을 누르면 그 질문으로 새로 시작한다. */
  function askWonder(q: string) {
    reset();
    setDraft(q);
    submitQuestion(q);
  }

  const okAnswers = result?.answers.filter((a) => a.ok) ?? [];
  const primary = okAnswers[0];
  const others = okAnswers.slice(1);
  const failed = result?.answers.filter((a) => !a.ok) ?? [];
  const answerStep = isDirect ? 2 : 3;
  const followUps = result?.judge?.followUps ?? [];
  const puzzles = result?.judge?.puzzles ?? [];

  return (
    <div className="space-y-4">
      {/* 1. 질문 */}
      <Card>
        <StepTitle step={1}>궁금한 걸 적어 봐요</StepTitle>
        {step === "ask" ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submitQuestion(draft);
            }}
            className="space-y-3"
          >
            <TextArea
              label="질문"
              value={draft}
              onChange={setDraft}
              placeholder="예) 달은 왜 모양이 바뀌어요?  /  달까지 거리는 얼마예요?"
              rows={2}
            />
            <div className="flex items-center gap-3">
              <Button type="submit" disabled={loading || draft.trim().length < 2}>
                다음
              </Button>
              {loading && <Spinner text={loadingText} />}
            </div>
          </form>
        ) : (
          <p className="text-base font-medium text-stone-800">“{question}”</p>
        )}
      </Card>

      {/* 부적절한 질문 */}
      {think && !think.safe && (
        <Card className="ring-rose-200">
          <p className="text-[15px] leading-relaxed text-stone-800">{think.redirectMessage}</p>
          <div className="mt-3">
            <Button onClick={reset} variant="secondary">
              다른 질문 하기
            </Button>
          </div>
        </Card>
      )}

      {/* 2. 생각 먼저 (생각이 필요한 질문만) */}
      {think && think.safe && !isDirect && (
        <Card>
          <StepTitle step={2}>AI에게 묻기 전에, 먼저 생각해 봐요</StepTitle>
          {step === "think" ? (
            <div className="space-y-4">
              <p className="rounded-xl bg-amber-50 p-3 text-[15px] leading-relaxed text-stone-800">
                🤔 {think.guidingQuestion}
              </p>
              <TextArea
                label="내가 이미 아는 것, 떠오르는 생각"
                value={priorKnowledge}
                onChange={setPriorKnowledge}
                placeholder="짧아도 괜찮아요."
              />
              <p className="text-[15px] leading-relaxed text-stone-700">✏️ {think.predictionPrompt}</p>
              <TextArea
                label="내 예상 (꼭 적어야 다음으로 갈 수 있어요)"
                value={prediction}
                onChange={setPrediction}
                placeholder="예) 지구 그림자 때문일 것 같아요"
                rows={2}
              />
              {showHint ? (
                <p className="rounded-xl bg-stone-100 p-3 text-sm text-stone-700">💡 힌트: {think.hint}</p>
              ) : (
                <button type="button" onClick={() => setShowHint(true)} className="text-sm text-amber-700 underline">
                  막혔어요, 힌트 보여 주세요
                </button>
              )}
              <div className="flex items-center gap-3">
                <Button onClick={submitThinking} disabled={loading || prediction.trim().length < 2}>
                  이제 AI에게 물어보기
                </Button>
                {loading && <Spinner text={loadingText} />}
              </div>
            </div>
          ) : (
            <div className="space-y-1 text-sm text-stone-700">
              {priorKnowledge && <p>아는 것: {priorKnowledge}</p>}
              <p>
                내 예상: <span className="font-semibold">{prediction}</span>
              </p>
            </div>
          )}
        </Card>
      )}

      {/* 3. 답변 */}
      {result && (
        <Card>
          <StepTitle step={answerStep}>{isDirect ? "바로 알려 줄게요" : "AI의 답을 읽어 봐요"}</StepTitle>
          {isDirect && (
            <p className="mb-3 text-sm text-stone-500">이건 생각할 것보다 알면 되는 거라 바로 답해요. 그래도 AI 답은 한 번 확인해 봐요.</p>
          )}
          {primary ? (
            <div className="space-y-4">
              <AnswerCard answer={primary} highlight />

              {!compared ? (
                <div className="rounded-xl border border-dashed border-stone-300 p-4 text-center">
                  <p className="mb-3 text-sm text-stone-600">
                    AI는 가끔 틀린 걸 자신 있게 말해요. 다른 AI는 뭐라고 하는지 비교해 볼까요?
                  </p>
                  <Button onClick={compare} disabled={others.length === 0 && !result.judge}>
                    다른 AI는 뭐라고 할까? 🔎
                  </Button>
                  {others.length === 0 && (
                    <p className="mt-2 text-xs text-stone-400">지금은 비교할 다른 AI 답이 없어요.</p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {others.map((a) => (
                    <AnswerCard key={a.provider} answer={a} />
                  ))}
                  {failed.map((a) => (
                    <AnswerCard key={a.provider} answer={a} />
                  ))}
                  {result.judge && (
                    <div className="space-y-3 rounded-xl bg-white p-4 ring-1 ring-stone-200">
                      <AgreementBanner agreement={result.judge.agreement} />
                      <p className="text-[15px] leading-relaxed text-stone-800">{result.judge.kidSummary}</p>
                      {result.judge.differences.length > 0 && (
                        <div>
                          <p className="mb-1 text-sm font-semibold text-stone-700">서로 달랐던 점</p>
                          <ul className="list-disc space-y-0.5 pl-5 text-sm text-stone-700">
                            {result.judge.differences.map((d) => (
                              <li key={d}>{d}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {result.judge.riskyClaims.length > 0 && (
                        <div>
                          <p className="mb-1 text-sm font-semibold text-rose-700">⚠️ 틀리기 쉬운 부분</p>
                          <ul className="space-y-1 text-sm text-stone-700">
                            {result.judge.riskyClaims.map((r) => (
                              <li key={r.claim}>
                                <span className="font-medium">{r.claim}</span> · {r.why}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <div>
                        <p className="mb-1 text-sm font-semibold text-emerald-700">✅ 직접 확인하는 방법</p>
                        <ul className="list-disc space-y-0.5 pl-5 text-sm text-stone-700">
                          {result.judge.checkTips.map((t) => (
                            <li key={t}>{t}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!isDirect && step === "answer" && (
                <div className="pt-1">
                  <Button onClick={() => setStep("reflect")} variant="secondary">
                    다 읽었어요, 정리하기
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-stone-600">AI들이 지금은 답을 주지 못했어요. 잠시 후 다시 해 봐요.</p>
          )}
        </Card>
      )}

      {/* 바로 답한 질문: AI가 되묻기 + 그 사실로 풀어 보는 문제 */}
      {isDirect && result && primary && (
        <>
          {followUps.length > 0 && (
            <Card className="bg-amber-50/60">
              <h2 className="mb-1 text-base font-bold text-stone-800">🙋 이번엔 내가 물어볼게요</h2>
              <p className="mb-3 text-xs text-stone-500">먼저 머릿속으로 찍어 보고, 궁금하면 눌러요. 그 질문으로 이어져요.</p>
              <ul className="space-y-2">
                {followUps.map((q) => (
                  <li key={q}>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => askWonder(q)}
                      className="w-full rounded-xl bg-white p-3 text-left text-[15px] text-stone-800 ring-1 ring-amber-200 hover:bg-amber-100 disabled:opacity-40"
                    >
                      {q}
                    </button>
                  </li>
                ))}
              </ul>
              {loading && (
                <div className="mt-3">
                  <Spinner text={loadingText} />
                </div>
              )}
            </Card>
          )}

          {puzzles.length > 0 && (
            <Card>
              <h2 className="mb-1 text-base font-bold text-stone-800">🧩 이걸로 풀어 보는 문제</h2>
              <p className="mb-3 text-xs text-stone-500">방금 알게 된 걸로 어림해 봐요. 내 답을 적어야 풀이를 볼 수 있어요.</p>
              <div className="space-y-4">
                {puzzles.map((pz, i) => (
                  <PuzzleCard key={i} puzzle={pz} />
                ))}
              </div>
            </Card>
          )}

          <div className="flex items-center gap-3">
            <Button onClick={reset} variant="secondary">
              다른 거 물어보기
            </Button>
          </div>
        </>
      )}

      {/* 4. 반성 (생각이 필요한 질문만) */}
      {!isDirect && (step === "reflect" || step === "done") && (
        <Card>
          <StepTitle step={4}>한 줄로 정리해 봐요</StepTitle>
          {step === "reflect" ? (
            <div className="space-y-3">
              <TextArea
                label="오늘 새로 알게 된 것, 또는 내 예상과 달랐던 것"
                value={reflection}
                onChange={setReflection}
                rows={2}
              />
              <label className="flex items-center gap-2 text-sm text-stone-700">
                <input type="checkbox" checked={doubted} onChange={(e) => setDoubted(e.target.checked)} />
                AI 답 중에 “정말일까?” 싶어서 확인해 보고 싶은 부분이 있었어요
              </label>
              <div className="flex items-center gap-3">
                <Button onClick={submitReflection} disabled={loading || reflection.trim().length < 2}>
                  마무리
                </Button>
                {loading && <Spinner text={loadingText} />}
              </div>
            </div>
          ) : (
            feedback && (
              <div className="space-y-3 text-[15px] leading-relaxed text-stone-800">
                <p className="rounded-xl bg-emerald-50 p-3">🎉 {feedback.encouragement}</p>
                <p>{feedback.comparison}</p>
                <p>
                  <span className="font-semibold">확인해 보기:</span> {feedback.verifyTip}
                </p>
                <p className="rounded-xl bg-amber-50 p-3">
                  <span className="font-semibold">다음에 궁금해할 만한 것:</span> {feedback.nextQuestion}
                </p>
                <div className="pt-1">
                  <Button onClick={reset}>새 질문 하기</Button>
                </div>
              </div>
            )
          )}
        </Card>
      )}

      {error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800 ring-1 ring-rose-200">{error}</p>}
    </div>
  );
}

/** 추론 문제 하나. 아이가 답을 적어야 풀이가 열린다. */
function PuzzleCard({ puzzle }: { puzzle: Puzzle }) {
  const [attempt, setAttempt] = useState("");
  const [hint, setHint] = useState(false);
  const [revealed, setRevealed] = useState(false);
  return (
    <div className="rounded-xl bg-stone-50 p-4 ring-1 ring-stone-200">
      <p className="text-[15px] leading-relaxed text-stone-800">{puzzle.question}</p>
      <div className="mt-3 flex gap-2">
        <input
          value={attempt}
          onChange={(e) => setAttempt(e.target.value)}
          disabled={revealed}
          placeholder="내 답 (어림해도 괜찮아요)"
          aria-label="내 답"
          className="min-w-0 flex-1 rounded-xl border border-stone-300 px-3 py-2 text-base outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-200 disabled:bg-stone-100"
        />
        {!revealed && (
          <Button onClick={() => setRevealed(true)} disabled={attempt.trim().length < 1}>
            풀이 보기
          </Button>
        )}
      </div>
      {!revealed &&
        (hint ? (
          <p className="mt-2 text-sm text-stone-600">💡 {puzzle.hint}</p>
        ) : (
          <button type="button" onClick={() => setHint(true)} className="mt-2 text-sm text-amber-700 underline">
            힌트 보기
          </button>
        ))}
      {revealed && (
        <div className="mt-3 space-y-1 text-sm">
          <p className="text-stone-600">
            내 답: <span className="font-semibold text-stone-800">{attempt}</span>
          </p>
          <p className="rounded-lg bg-white p-3 leading-relaxed text-stone-800 ring-1 ring-emerald-200">✅ {puzzle.solution}</p>
          <p className="text-xs text-stone-500">딱 맞지 않아도 괜찮아요. 어림하는 방법을 떠올린 게 진짜예요.</p>
        </div>
      )}
    </div>
  );
}
