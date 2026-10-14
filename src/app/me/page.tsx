import { Suspense } from "react";
import { ChildChip } from "@/components/ChildChip";
import { GameList, HabitStats, QuestionItem } from "@/components/HabitStats";
import { requireActiveChild } from "@/lib/auth";
import { listGameResults, listQuestionLogs } from "@/lib/logs";

export default function MePage() {
  return (
    <Suspense fallback={<p className="py-6 text-sm text-ink-soft">불러오는 중...</p>}>
      <MeContent />
    </Suspense>
  );
}

async function MeContent() {
  const { child } = await requireActiveChild();
  const [logs, games] = await Promise.all([listQuestionLogs(child.id), listGameResults(child.id)]);

  return (
    <div className="flex flex-1 flex-col">
      <ChildChip child={child} />
      <div className="space-y-8 py-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">내 습관</h1>
          <p className="mt-1 text-sm text-ink-soft">AI에게 묻기 전에 얼마나 생각했는지, AI 답을 얼마나 확인했는지 모아 봤어요.</p>
        </div>

        <HabitStats logs={logs} games={games} />

        <section>
          <h2 className="text-base font-semibold text-ink">내 질문</h2>
          <p className="mt-0.5 text-[12px] text-ink-soft">여기 있는 질문은 나만 볼 수 있어요.</p>
          {logs.length === 0 ? (
            <p className="mt-4 text-sm text-ink-soft">아직 질문이 없어요.</p>
          ) : (
            <ul className="mt-2 divide-y divide-line">
              {logs.map((r) => (
                <QuestionItem key={r.id} log={r} />
              ))}
            </ul>
          )}
        </section>

        {games.length > 0 && (
          <section>
            <h2 className="text-base font-semibold text-ink">내 게임</h2>
            <div className="mt-2">
              <GameList games={games} />
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
