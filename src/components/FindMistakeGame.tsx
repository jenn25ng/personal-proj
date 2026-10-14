"use client";

import { useState } from "react";
import { MISTAKE_TYPE_LABEL, type GamePuzzle } from "@/lib/types";
import { AiMsg, Chip, Composer, UserMsg } from "./chat";
import { Button, Spinner } from "./ui";

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

export function FindMistakeGame({ gamesLeft, nickname }: { gamesLeft: number; nickname: string }) {
  const [phase, setPhase] = useState<Phase>("pick");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [topic, setTopic] = useState<string | null>(null);
  const [puzzle, setPuzzle] = useState<GamePuzzle | null>(null);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [played, setPlayed] = useState(0);

  const left = Math.max(0, gamesLeft - played);

  async function start(t: string) {
    const clean = t.trim();
    if (clean.length < 2 || loading) return;
    setLoading(true);
    setError(null);
    setTopic(clean);
    setPuzzle(null);
    setPicked(new Set());
    setPhase("pick");
    setDraft("");
    try {
      const res = await fetch("/api/game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: clean }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "문제가 생겼어요.");
      setPuzzle(data as GamePuzzle);
      if ((data as GamePuzzle).safe) {
        setPlayed((n) => n + 1);
        setPhase("play");
      }
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
    fetch("/api/logs/game", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic: puzzle.topic,
        wrongCount: puzzle.sentences.filter((s) => s.isWrong).length,
        found,
        falseAlarms,
        puzzle,
      }),
    }).catch((err) => console.error("기록 저장 실패", err));
    setPhase("result");
  }

  function reset() {
    setPhase("pick");
    setTopic(null);
    setPuzzle(null);
    setPicked(new Set());
    setError(null);
  }

  const wrongCount = puzzle?.sentences.filter((s) => s.isWrong).length ?? 0;
  const found = puzzle?.sentences.filter((s, i) => s.isWrong && picked.has(i)).length ?? 0;
  const falseAlarms = puzzle?.sentences.filter((s, i) => !s.isWrong && picked.has(i)).length ?? 0;
  const perfect = found === wrongCount && falseAlarms === 0;
  // 새 주제는 지금 진행 중인 게임이 없을 때만 고를 수 있다.
  const canPick = (phase === "pick" || phase === "result") && !loading && left > 0;

  return (
    <div className="flex flex-1 flex-col">
      {/* ---------- 대화 ---------- */}
      <div className="flex-1 space-y-6 py-4">
        {!topic && !loading && (
          <div className="flex flex-col items-start gap-4 py-10">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-ink">{nickname}, 틀린 문장을 찾아볼까?</h1>
              <p className="mt-1 text-sm text-ink-soft">
                AI가 주제에 대한 설명글을 쓰는데, 그 안에 일부러 틀린 문장을 숨겨요. AI는 가끔 틀린 말을 아주 자신 있게 하거든요.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {TOPICS.map((t) => (
                <Chip key={t} onClick={() => start(t)}>
                  {t}
                </Chip>
              ))}
            </div>
          </div>
        )}

        {topic && <UserMsg>{topic}</UserMsg>}

        {loading && (
          <AiMsg>
            <Spinner text="설명글을 쓰면서 틀린 문장을 몰래 섞고 있어요" />
          </AiMsg>
        )}

        {error && (
          <AiMsg>
            <p>{error}</p>
            {left > 0 && (
              <div className="flex flex-wrap gap-2">
                {TOPICS.slice(0, 4).map((t) => (
                  <Chip key={t} onClick={() => start(t)}>
                    {t}
                  </Chip>
                ))}
              </div>
            )}
          </AiMsg>
        )}

        {puzzle && !puzzle.safe && (
          <AiMsg>
            <p>{puzzle.redirectMessage}</p>
            <div className="flex flex-wrap gap-2">
              {TOPICS.slice(0, 4).map((t) => (
                <Chip key={t} onClick={() => start(t)}>
                  {t}
                </Chip>
              ))}
            </div>
          </AiMsg>
        )}

        {puzzle && puzzle.safe && (
          <AiMsg>
            <p>{puzzle.intro}</p>
            <div className="rounded-2xl border border-line p-4">
              <p className="mb-3 text-[12px] text-ink-soft">
                이 글은 게임용으로 일부러 틀리게 쓴 거예요. 틀린 문장은 {wrongCount}개예요. 틀렸다고 생각하는 문장을 눌러요.
              </p>
              <ol className="space-y-2">
                {puzzle.sentences.map((s, i) => {
                  const isPicked = picked.has(i);
                  let cls = isPicked ? "border-accent bg-accent-soft" : "border-line hover:bg-surface";
                  let tag: { text: string; cls: string } | null = null;
                  if (phase === "result") {
                    if (s.isWrong && isPicked) {
                      cls = "border-ok bg-ok-soft";
                      tag = { text: "찾았어요", cls: "text-ok" };
                    } else if (s.isWrong && !isPicked) {
                      cls = "border-bad bg-bad-soft";
                      tag = { text: "놓쳤어요. 이 문장이 틀렸어요", cls: "text-bad" };
                    } else if (!s.isWrong && isPicked) {
                      cls = "border-warn bg-warn-soft";
                      tag = { text: "이건 맞는 문장이었어요", cls: "text-warn" };
                    } else {
                      cls = "border-line";
                    }
                  }
                  return (
                    <li key={i}>
                      <button
                        type="button"
                        disabled={phase === "result"}
                        onClick={() => toggle(i)}
                        aria-pressed={isPicked}
                        className={`flex w-full gap-2.5 rounded-xl border p-3 text-left text-[15px] leading-relaxed text-ink transition disabled:cursor-default ${cls}`}
                      >
                        <span className="mt-0.5 w-4 shrink-0 text-[12px] font-semibold tabular-nums text-ink-soft">{i + 1}</span>
                        <span className="min-w-0 flex-1">
                          {s.text}
                          {tag && <span className={`mt-1 block text-[13px] font-semibold ${tag.cls}`}>{tag.text}</span>}
                          {phase === "result" && s.isWrong && (
                            <span className="mt-2 block space-y-1 text-[13px] text-ink-soft">
                              <span className="block">
                                <span className="font-semibold text-ink">바르게 고치면</span> {s.correction}
                              </span>
                              <span className="block">
                                <span className="font-semibold text-ink">
                                  AI의 수법 · {s.mistakeType !== "none" ? MISTAKE_TYPE_LABEL[s.mistakeType] : ""}
                                </span>{" "}
                                {s.whyTricky}
                              </span>
                            </span>
                          )}
                        </span>
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
                  <span className="text-[13px] text-ink-soft">{picked.size}개 골랐어요</span>
                </div>
              )}
            </div>
          </AiMsg>
        )}

        {puzzle && puzzle.safe && phase === "result" && (
          <AiMsg>
            <div>
              <p className="font-semibold">
                결과 · 틀린 문장 {wrongCount}개 중 {found}개를 찾았어요
                {falseAlarms > 0 && <span className="font-normal text-ink-soft"> · 맞는 문장 {falseAlarms}개를 의심했어요</span>}
              </p>
              <p className="mt-1 text-sm text-ink-soft">
                {perfect
                  ? "완벽해요! AI가 자신 있게 말해도 속지 않았어요."
                  : found === wrongCount
                    ? "틀린 걸 다 찾았어요. 맞는 문장까지 의심한 건 괜찮아요. 의심하고 확인하는 게 바로 좋은 습관이에요."
                    : "괜찮아요. AI의 거짓말은 어른도 자주 속아요. 어디서 속았는지 보는 게 진짜 공부예요."}
              </p>
            </div>
            <div className="rounded-2xl border border-line bg-surface p-4">
              <p className="mb-1 text-[12px] font-semibold text-ink-soft">오늘 배운 것</p>
              <p>{puzzle.lesson}</p>
            </div>
            {left > 0 ? (
              <div className="flex flex-wrap gap-2">
                <Chip onClick={() => start(puzzle.topic)} disabled={loading}>
                  같은 주제로 한 번 더
                </Chip>
                <Chip onClick={reset} disabled={loading}>
                  다른 주제
                </Chip>
              </div>
            ) : (
              <p className="text-sm text-ink-soft">오늘 게임은 여기까지예요. 내일 다시 할 수 있어요.</p>
            )}
          </AiMsg>
        )}
      </div>

      {/* ---------- 입력창 ---------- */}
      <Composer
        value={draft}
        onChange={setDraft}
        onSubmit={() => start(draft)}
        disabled={!canPick}
        label="직접 주제 적기"
        placeholder={left === 0 ? "오늘 게임은 다 했어요" : canPick ? "직접 주제를 적어도 돼요" : "먼저 틀린 문장을 골라요"}
        hint={`${left > 0 ? `오늘 ${left}번 더 할 수 있어요` : "내일 다시 열려요"} · Enter로 시작, Shift+Enter로 줄바꿈`}
      />
    </div>
  );
}
