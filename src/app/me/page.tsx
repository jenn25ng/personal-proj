import { Suspense } from "react";
import { ChildChip } from "@/components/ChildChip";
import { GameList, HabitStats, QuestionItem } from "@/components/HabitStats";
import { Card } from "@/components/ui";
import { setQuestionShared } from "@/lib/actions";
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
        <p className="mt-1 text-sm text-stone-600">
          부모님이 보는 숫자와 똑같은 화면이에요. 질문 내용은 내가 “보여 주기”를 켠 것만 부모님께 보여요.
        </p>
      </div>

      <HabitStats logs={logs} games={games} />

      <Card>
        <h2 className="mb-1 text-base font-bold text-stone-800">내 질문</h2>
        <p className="mb-3 text-xs text-stone-500">
          여기 있는 건 나만 볼 수 있어요. 부모님과 같이 확인하고 싶은 질문은 “보여 주기”를 켜요.
        </p>
        {logs.length === 0 ? (
          <p className="text-sm text-stone-500">아직 질문이 없어요.</p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {logs.map((r) => (
              <QuestionItem
                key={r.id}
                log={r}
                action={
                  <form action={setQuestionShared} className="flex items-center gap-2">
                    <input type="hidden" name="logId" value={r.id} />
                    <input type="hidden" name="shared" value={r.sharedWithParent ? "0" : "1"} />
                    <span className={`text-xs ${r.sharedWithParent ? "text-emerald-700" : "text-stone-400"}`}>
                      {r.sharedWithParent ? "👀 부모님께 보여 주는 중" : "🔒 나만 보는 중"}
                    </span>
                    <button
                      type="submit"
                      className="rounded-lg bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-700 hover:bg-stone-200"
                    >
                      {r.sharedWithParent ? "보여 주기 끄기" : "보여 주기 켜기"}
                    </button>
                  </form>
                }
              />
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
