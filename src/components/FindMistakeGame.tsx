"use client";

import { useState } from "react";
import { saveGame } from "@/lib/history";
import { MISTAKE_TYPE_LABEL, type GamePuzzle } from "@/lib/types";
import { Button, Card, Spinner, StepTitle } from "./ui";

const TOPICS = [
  "달과 지구",
  "물의 순환",
  "식물의 한살이",
  "우리 몸의 소화",
  "세종대왕과 한글",
  "삼국 시대",
  "날씨와 계절",
  "전기와 자석",
  "태양계 행성",
  "우리나라 지도",
];

type Phase = "pick" | "play" | "result";

export function FindMistakeGame() {
  const [phase, setPhase] = useState<Phase>("pick");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customTopic, setCustomTopic] = useState("");
  const [puzzle, setPuzzle] = useState<GamePuzzle | null>(null);
  const [picked, setPicked] = useState<Set<number>>(new Set());

  async function start(topic: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "문제가 생겼어요.");
      setPuzzle(data as GamePuzzle);
      setPicked(new Set());
      setPhase("play");
    } catch (e) {
      setError(e instanceof Error ? e.message : "문제가 생겼어요.");
    } finally {
      setLoading(false);
    }
  }

  function toggle(i: number) {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  function check() {
    if (!puzzle) return;
    const found = puzzle.sentences.filter((s, i) => s.isWrong && picked.has(i)).length;
    const falseAlarms = puzzle.sentences.filter((s, i) => !s.isWrong && picked.has(i)).length;
    saveGame({
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      topic: puzzle.topic,
      wrongCount: puzzle.sentences.filter((s) => s.isWrong).length,
      found,
      falseAlarms,
    });
    setPhase("result");
  }

  function reset() {
    setPhase("pick");
    setPuzzle(null);
    setPicked(new Set());
    setError(null);
  }

  const wrongCount = puzzle?.sentences.filter((s) => s.isWrong).length ?? 0;
  const found = puzzle?.sentences.filter((s, i) => s.isWrong && picked.has(i)).length ?? 0;
  const falseAlarms = puzzle?.sentences.filter((s, i) => !s.isWrong && picked.has(i)).length ?? 0;

  if (phase === "pick") {
    return (
      <Card>
        <StepTitle step={1}>주제를 골라요</StepTitle>
        <p className="mb-3 text-sm text-stone-600">
          AI가 고른 주제로 설명글을 써 줘요. 그런데 그 안에 <span className="font-semibold">일부러 틀린 문장</span>이
          숨어 있어요. 찾아낼 수 있을까요?
        </p>
        <div className="mb-4 flex flex-wrap gap-2">
          {TOPICS.map((t) => (
            <button
              key={t}
              type="button"
              disabled={loading}
              onClick={() => start(t)}
              className="rounded-full bg-amber-100 px-3 py-1.5 text-sm font-medium text-amber-900 hover:bg-amber-200 disabled:opacity-40"
            >
              {t}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (customTopic.trim().length >= 2) start(customTopic.trim());
          }}
          className="flex gap-2"
        >
          <input
            value={customTopic}
            onChange={(e) => setCustomTopic(e.target.value)}
            placeholder="아니면 직접 주제를 적어요"
            aria-label="직접 주제 적기"
            className="min-w-0 flex-1 rounded-xl border border-stone-300 px-3 py-2 text-base outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
          />
          <Button type="submit" disabled={loading || customTopic.trim().length < 2}>
            시작
          </Button>
        </form>
        {loading && (
          <div className="mt-3">
            <Spinner text="AI가 틀린 문장을 몰래 섞고 있어요" />
          </div>
        )}
        {error && <p className="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-800 ring-1 ring-rose-200">{error}</p>}
      </Card>
    );
  }

  if (!puzzle) return null;

  if (!puzzle.safe) {
    return (
      <Card className="ring-rose-200">
        <p className="text-[15px] leading-relaxed text-stone-800">{puzzle.redirectMessage}</p>
        <div className="mt-3">
          <Button onClick={reset} variant="secondary">
            다른 주제 고르기
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <StepTitle step={2}>틀린 문장을 찾아 눌러요</StepTitle>
        <p className="mb-1 text-[15px] text-stone-800">{puzzle.intro}</p>
        <p className="mb-4 text-xs text-stone-500">
          ※ 이 글은 게임용으로 일부러 틀리게 만든 거예요. 틀린 문장은 {wrongCount}개예요.
        </p>
        <ol className="space-y-2">
          {puzzle.sentences.map((s, i) => {
            const isPicked = picked.has(i);
            let cls = isPicked ? "bg-amber-100 ring-amber-400" : "bg-stone-50 ring-stone-200 hover:bg-stone-100";
            let tag: string | null = null;
            if (phase === "result") {
              if (s.isWrong && isPicked) {
                cls = "bg-emerald-50 ring-emerald-400";
                tag = "✅ 찾았어요!";
              } else if (s.isWrong && !isPicked) {
                cls = "bg-rose-50 ring-rose-400";
                tag = "❌ 놓쳤어요. 이 문장이 틀렸어요";
              } else if (!s.isWrong && isPicked) {
                cls = "bg-amber-50 ring-amber-300";
                tag = "🤔 이건 맞는 문장이었어요";
              } else {
                cls = "bg-white ring-stone-200";
              }
            }
            return (
              <li key={i}>
                <button
                  type="button"
                  disabled={phase === "result"}
                  onClick={() => toggle(i)}
                  aria-pressed={isPicked}
                  className={`w-full rounded-xl p-3 text-left text-[15px] leading-relaxed ring-1 transition disabled:cursor-default ${cls}`}
                >
                  <span className="mr-2 text-xs font-bold text-stone-400">{i + 1}</span>
                  {s.text}
                  {tag && <span className="mt-1 block text-sm font-semibold">{tag}</span>}
                  {phase === "result" && s.isWrong && (
                    <span className="mt-2 block space-y-1 text-sm text-stone-700">
                      <span className="block">
                        <span className="font-semibold">바르게 고치면:</span> {s.correction}
                      </span>
                      <span className="block">
                        <span className="font-semibold">
                          AI의 수법 · {s.mistakeType !== "none" ? MISTAKE_TYPE_LABEL[s.mistakeType] : ""}:
                        </span>{" "}
                        {s.whyTricky}
                      </span>
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ol>

        {phase === "play" && (
          <div className="mt-4 flex items-center gap-3">
            <Button onClick={check} disabled={picked.size === 0}>
              확인하기
            </Button>
            <span className="text-sm text-stone-500">{picked.size}개 골랐어요</span>
          </div>
        )}
      </Card>

      {phase === "result" && (
        <Card>
          <StepTitle step={3}>결과</StepTitle>
          <p className="text-lg font-bold text-stone-900">
            틀린 문장 {wrongCount}개 중 {found}개를 찾았어요
            {falseAlarms > 0 && <span className="text-base font-medium text-stone-500"> · 맞는 문장 {falseAlarms}개를 의심했어요</span>}
          </p>
          <p className="mt-2 text-sm text-stone-600">
            {found === wrongCount && falseAlarms === 0
              ? "완벽해요! AI가 자신 있게 말해도 속지 않았어요."
              : falseAlarms > 0 && found === wrongCount
                ? "틀린 걸 다 찾았어요. 맞는 문장까지 의심한 건 괜찮아요. 의심하고 확인하는 게 바로 좋은 습관이에요."
                : "괜찮아요. AI의 거짓말은 어른도 자주 속아요. 어디서 속았는지 보는 게 진짜 공부예요."}
          </p>
          <p className="mt-3 rounded-xl bg-amber-50 p-3 text-[15px] leading-relaxed text-stone-800">💡 {puzzle.lesson}</p>
          <div className="mt-4 flex gap-2">
            <Button onClick={() => start(puzzle.topic)} disabled={loading}>
              같은 주제로 한 번 더
            </Button>
            <Button onClick={reset} variant="secondary">
              다른 주제
            </Button>
          </div>
          {loading && (
            <div className="mt-3">
              <Spinner text="새 문제를 만들고 있어요" />
            </div>
          )}
          {error && <p className="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-800 ring-1 ring-rose-200">{error}</p>}
        </Card>
      )}
    </div>
  );
}
