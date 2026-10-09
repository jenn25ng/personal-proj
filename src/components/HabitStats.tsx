import type { GameResult, QuestionLog } from "@/db/schema";

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl bg-white p-4 ring-1 ring-stone-200">
      <p className="text-xs text-stone-500">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-stone-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-stone-400">{hint}</p>}
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
  const predicted = logs.filter((r) => r.prediction.trim().length > 0).length;
  const compared = logs.filter((r) => r.comparedModels).length;
  const doubted = logs.filter((r) => r.doubtedAi).length;
  const disagreed = logs.filter((r) => r.agreement && r.agreement !== "agree").length;
  const gameWrong = games.reduce((a, g) => a + g.wrongCount, 0);
  const gameFound = games.reduce((a, g) => a + g.found, 0);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="질문 수" value={String(n)} />
        <Stat label="먼저 예상한 비율" value={pct(predicted)} hint="묻기 전에 자기 생각을 적은 횟수" />
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

export const AGREEMENT_LABEL: Record<string, string> = { agree: "🟢 일치", partly: "🟡 부분 일치", disagree: "🔴 불일치" };

export function QuestionItem({ log, action }: { log: QuestionLog; action?: React.ReactNode }) {
  return (
    <li className="py-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold text-stone-800">{log.question}</p>
        <span className="text-xs text-stone-400">{log.createdAt.toLocaleString("ko-KR")}</span>
      </div>
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-stone-500">
        {log.topicLabel && <span>주제: {log.topicLabel}</span>}
        {log.agreement && <span>{AGREEMENT_LABEL[log.agreement]}</span>}
        {log.comparedModels && <span>비교함</span>}
        {log.doubtedAi && <span>의심함</span>}
        {log.usedHint && <span>힌트 사용</span>}
      </div>
      {log.prediction && <p className="mt-1 text-stone-700">예상: {log.prediction}</p>}
      {log.reflection && <p className="text-stone-700">정리: {log.reflection}</p>}
      {action && <div className="mt-2">{action}</div>}
    </li>
  );
}

export function GameList({ games }: { games: GameResult[] }) {
  if (games.length === 0) return null;
  return (
    <ul className="divide-y divide-stone-100">
      {games.slice(0, 10).map((g) => (
        <li key={g.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
          <span className="font-semibold text-stone-800">{g.topic}</span>
          <span className="text-stone-600">
            {g.wrongCount}개 중 {g.found}개 찾음{g.falseAlarms > 0 && ` · 맞는 문장 ${g.falseAlarms}개 의심`}
          </span>
          <span className="text-xs text-stone-400">{g.createdAt.toLocaleDateString("ko-KR")}</span>
        </li>
      ))}
    </ul>
  );
}
