import { Suspense } from "react";
import { ChildChip } from "@/components/ChildChip";
import { GameList, HabitStats, QuestionItem } from "@/components/HabitStats";
import { Card } from "@/components/ui";
import { requireActiveChild } from "@/lib/auth";
import { listGameResults, listQuestionLogs } from "@/lib/logs";

export default function MePage() {
  return (
    <Suspense fallback={<p className="text-sm text-stone-500">불러오는 중...</p>}>
      <MeContent />
    </Suspense>
  );
}

async function MeContent() {
  const { child } = await requireActiveChild();
  const [logs, games] = await Promise.all([listQuestionLogs(child.id), listGameResults(child.id)]);

  return (
    <div className="space-y-5">
      <ChildChip child={child} />
      <div>
        <h1 className="text-2xl font-extrabold text-stone-900">내 습관</h1>
        <p className="mt-1 text-sm text-stone-600">AI에게 묻기 전에 얼마나 생각했는지, AI 답을 얼마나 확인했는지 모아 봤어요.</p>
      </div>

      <HabitStats logs={logs} games={games} />

      <Card>
        <h2 className="mb-1 text-base font-bold text-stone-800">내 질문</h2>
        <p className="mb-3 text-xs text-stone-500">여기 있는 질문은 나만 볼 수 있어요.</p>
        {logs.length === 0 ? (
          <p className="text-sm text-stone-500">아직 질문이 없어요.</p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {logs.map((r) => (
              <QuestionItem key={r.id} log={r} />
            ))}
          </ul>
        )}
      </Card>

      {games.length > 0 && (
        <Card>
          <h2 className="mb-3 text-base font-bold text-stone-800">내 게임</h2>
          <GameList games={games} />
        </Card>
      )}
    </div>
  );
}
