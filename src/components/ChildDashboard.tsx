import type { Child, GameResult, QuestionLog } from "@/db/schema";
import { GameList, HabitStats, QuestionItem } from "./HabitStats";
import { Card } from "./ui";

/** 부모가 보는 아이 화면. 집계와, 아이가 보여 주기로 한 질문만. */
export function ChildDashboard({ child, logs, games }: { child: Child; logs: QuestionLog[]; games: GameResult[] }) {
  const shared = logs.filter((l) => l.sharedWithParent);

  if (logs.length === 0 && games.length === 0) {
    return (
      <Card>
        <p className="text-sm text-stone-600">
          <span className="font-semibold">{child.nickname}</span>의 기록이 아직 없어요. 질문이나 게임을 하나 마치면 여기에
          나타나요.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <HabitStats logs={logs} games={games} />
      <p className="text-xs text-stone-500">
        이 숫자들은 {child.nickname}도 ‘내 습관’ 화면에서 똑같이 볼 수 있어요. 질문 내용은 아이가 보여 주기로 한 것만 아래에
        나와요.
      </p>

      <Card>
        <h2 className="mb-1 text-base font-bold text-stone-800">{child.nickname}가 보여 주기로 한 질문</h2>
        {shared.length === 0 ? (
          <p className="text-sm text-stone-500">
            아직 보여 주기로 한 질문이 없어요. 아이가 “같이 확인해 보고 싶다”고 느낀 질문을 켜면 여기에 나와요.
            {logs.length > 0 && " 묻지 않아도 괜찮아요. 숫자가 이미 많은 걸 말해 줘요."}
          </p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {shared.map((r) => (
              <QuestionItem key={r.id} log={r} />
            ))}
          </ul>
        )}
      </Card>

      {games.length > 0 && (
        <Card>
          <h2 className="mb-3 text-base font-bold text-stone-800">최근 게임</h2>
          <GameList games={games} />
        </Card>
      )}
    </div>
  );
}
