import type { GameResult, QuestionLog } from "@/db/schema";

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-bg p-4">
      <p className="text-[12px] text-ink-soft">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-ink">{value}</p>
      {hint && <p className="mt-1 text-[11px] leading-snug text-ink-soft">{hint}</p>}
    </div>
  );
}

/**
 * 부모와 아이가 똑같이 보는 "습관" 집계. 질문 내용은 절대 들어가지 않는다.
 * 같은 컴포넌트를 두 화면에서 쓰는 것이 "부모도 이것만 본다"는 약속의 근거다.
 */
export function HabitStats({ logs, games }: { logs: QuestionLog[]; games: GameResult[] }) {
  const n = logs.length;
  const pct = (count: number) => (n === 0 ? "-" : `${Math.round((count / n) * 100)}%`);
  // "먼저 예상"은 생각이 필요한 질문에만 해당한다. 바로 답한 질문은 분모에서 뺀다.
  const thinkLogs = logs.filter((r) => r.mode === "think");
  const direct = n - thinkLogs.length;
  const predicted = thinkLogs.filter((r) => r.prediction.trim().length > 0).length;
  const predictedPct = thinkLogs.length === 0 ? "-" : `${Math.round((predicted / thinkLogs.length) * 100)}%`;
  const compared = logs.filter((r) => r.comparedModels).length;
  const doubted = logs.filter((r) => r.doubtedAi).length;
  const disagreed = logs.filter((r) => r.agreement && r.agreement !== "agree").length;
  const gameWrong = games.reduce((a, g) => a + g.wrongCount, 0);
  const gameFound = games.reduce((a, g) => a + g.found, 0);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="질문 수" value={String(n)} hint={direct > 0 ? `그중 바로 답한 질문 ${direct}개` : undefined} />
        <Stat label="먼저 예상한 비율" value={predictedPct} hint="생각이 필요한 질문 중, 묻기 전에 자기 생각을 적은 비율" />
        <Stat label="다른 AI와 비교" value={pct(compared)} hint="비교 버튼을 눌러 본 횟수" />
        <Stat label="AI 답을 의심" value={pct(doubted)} hint="확인하고 싶은 부분이 있었다고 표시" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="AI끼리 달랐던 질문" value={n === 0 ? "-" : `${disagreed}개`} hint="같이 확인해 보면 좋은 것" />
        <Stat label="틀린 거 찾기 게임" value={`${games.length}판`} />
        <Stat
          label="숨은 틀린 문장 찾은 비율"
          value={gameWrong === 0 ? "-" : `${Math.round((gameFound / gameWrong) * 100)}%`}
          hint={`${gameWrong}개 중 ${gameFound}개`}
        />
      </div>
    </div>
  );
}

const AGREEMENT: Record<string, { label: string; dot: string }> = {
  agree: { label: "AI끼리 일치", dot: "bg-ok" },
  partly: { label: "부분 일치", dot: "bg-warn" },
  disagree: { label: "불일치", dot: "bg-bad" },
};

function Meta({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex items-center gap-1.5 text-[12px] text-ink-soft">{children}</span>;
}

export function QuestionItem({ log }: { log: QuestionLog }) {
  const ag = log.agreement ? AGREEMENT[log.agreement] : null;
  return (
    <li className="py-3.5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[15px] leading-relaxed text-ink">{log.question}</p>
        <span className="shrink-0 pt-0.5 text-[12px] tabular-nums text-ink-soft">
          {log.createdAt.toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" })}
        </span>
      </div>
      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
        {log.topicLabel && !log.question.startsWith(log.topicLabel) && <Meta>{log.topicLabel}</Meta>}
        {ag && (
          <Meta>
            <span className={`h-1.5 w-1.5 rounded-full ${ag.dot}`} aria-hidden="true" />
            {ag.label}
          </Meta>
        )}
        {log.comparedModels && <Meta>비교함</Meta>}
        {log.doubtedAi && <Meta>의심함</Meta>}
        {log.usedHint && <Meta>힌트 사용</Meta>}
      </div>
      {(log.prediction || log.reflection) && (
        <div className="mt-2 space-y-1 border-l-2 border-line pl-3 text-[13px] leading-relaxed text-ink-soft">
          {log.prediction && (
            <p>
              <span className="text-ink">내 예상</span> {log.prediction}
            </p>
          )}
          {log.reflection && (
            <p>
              <span className="text-ink">정리</span> {log.reflection}
            </p>
          )}
        </div>
      )}
    </li>
  );
}

export function GameList({ games }: { games: GameResult[] }) {
  if (games.length === 0) return null;
  return (
    <ul className="divide-y divide-line">
      {games.slice(0, 10).map((g) => (
        <li key={g.id} className="flex items-start justify-between gap-3 py-3">
          <div className="min-w-0">
            <p className="text-[15px] text-ink">{g.topic}</p>
            <p className="mt-0.5 text-[12px] text-ink-soft">
              {g.wrongCount}개 중 {g.found}개 찾음{g.falseAlarms > 0 && ` · 맞는 문장 ${g.falseAlarms}개 의심`}
            </p>
          </div>
          <span className="shrink-0 pt-0.5 text-[12px] tabular-nums text-ink-soft">
            {g.createdAt.toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" })}
          </span>
        </li>
      ))}
    </ul>
  );
}
