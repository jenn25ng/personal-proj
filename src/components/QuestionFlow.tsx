"use client";

import { useState } from "react";
import { AnswerCard } from "./AnswerCard";
import { AgreementBanner, Button, Card, Spinner, StepTitle, TextArea } from "./ui";
import { saveRecord } from "@/lib/history";
import type { AnswerResult, ReflectResult, ThinkFirstResult } from "@/lib/types";

type Step = "ask" | "think" | "answer" | "reflect" | "done";

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
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
  const [error, setError] = useState<string | null>(null);

  const [question, setQuestion] = useState("");
  const [think, setThink] = useState<ThinkFirstResult | null>(null);
  const [priorKnowledge, setPriorKnowledge] = useState("");
  const [prediction, setPrediction] = useState("");
  const [showHint, setShowHint] = useState(false);

  const [result, setResult] = useState<AnswerResult | null>(null);
  const [compared, setCompared] = useState(false);

  const [reflection, setReflection] = useState("");
  const [doubted, setDoubted] = useState(false);
  const [feedback, setFeedback] = useState<ReflectResult | null>(null);

  function reset() {
    setStep("ask");
    setError(null);
    setQuestion("");
    setThink(null);
    setPriorKnowledge("");
    setPrediction("");
    setShowHint(false);
    setResult(null);
    setCompared(false);
    setReflection("");
    setDoubted(false);
    setFeedback(null);
  }

  async function run<T>(fn: () => Promise<T>, then: (v: T) => void) {
    setLoading(true);
    setError(null);
    try {
      then(await fn());
    } catch (e) {
      setError(e instanceof Error ? e.message : "문제가 생겼어요.");
    } finally {
      setLoading(false);
    }
  }

  const submitQuestion = () =>
    run(
      () => post<ThinkFirstResult>("/api/think", { question }),
      (t) => {
        setThink(t);
        setStep("think");
      },
    );

  const submitThinking = () =>
    run(
      () => post<AnswerResult>("/api/answer", { question, prediction, priorKnowledge }),
      (r) => {
        setResult(r);
        setStep("answer");
      },
    );

  const submitReflection = () => {
    const answerSummary =
      result?.judge?.kidSummary ?? result?.answers.find((a) => a.ok)?.text.slice(0, 500) ?? "";
    return run(
      () => post<ReflectResult>("/api/reflect", { question, prediction, answerSummary, reflection }),
      (f) => {
        setFeedback(f);
        setStep("done");
        saveRecord({
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          question,
          topicLabel: think?.topicLabel ?? "",
          prediction,
          priorKnowledge,
          usedHint: showHint,
          agreement: result?.judge?.agreement ?? null,
          comparedModels: compared,
          reflection,
          doubtedAi: doubted,
        });
      },
    );
  };

  const okAnswers = result?.answers.filter((a) => a.ok) ?? [];
  const primary = okAnswers[0];
  const others = okAnswers.slice(1);
  const failed = result?.answers.filter((a) => !a.ok) ?? [];

  return (
    <div className="space-y-4">
      {/* 1. 질문 */}
      <Card>
        <StepTitle step={1}>궁금한 걸 적어 봐요</StepTitle>
        {step === "ask" ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (question.trim().length >= 2) submitQuestion();
            }}
            className="space-y-3"
          >
            <TextArea
              label="질문"
              value={question}
              onChange={setQuestion}
              placeholder="예) 달은 왜 모양이 바뀌어요?"
              rows={2}
            />
            <div className="flex items-center gap-3">
              <Button type="submit" disabled={loading || question.trim().length < 2}>
                다음
              </Button>
              {loading && <Spinner text="생각할 거리를 준비하고 있어요" />}
            </div>
          </form>
        ) : (
          <p className="text-base font-medium text-stone-800">“{question}”</p>
        )}
      </Card>

      {/* 2. 생각 먼저 */}
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

      {think && think.safe && (
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
                {loading && <Spinner text="AI 세 개에게 동시에 묻고 있어요" />}
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
          <StepTitle step={3}>AI의 답을 읽어 봐요</StepTitle>
          {primary ? (
            <div className="space-y-4">
              <AnswerCard answer={primary} highlight />

              {!compared ? (
                <div className="rounded-xl border border-dashed border-stone-300 p-4 text-center">
                  <p className="mb-3 text-sm text-stone-600">
                    AI는 가끔 틀린 걸 자신 있게 말해요. 다른 AI는 뭐라고 하는지 비교해 볼까요?
                  </p>
                  <Button onClick={() => setCompared(true)} disabled={others.length === 0 && !result.judge}>
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

              {step === "answer" && (
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

      {/* 4. 반성 */}
      {(step === "reflect" || step === "done") && (
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
                {loading && <Spinner text="정리하고 있어요" />}
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
