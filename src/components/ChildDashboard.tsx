import type { Child, GameResult, QuestionLog } from "@/db/schema";
import { HabitStats } from "./HabitStats";

/** 부모가 보는 아이 화면. 집계뿐이고, 질문 내용도 개별 게임 결과도 넣지 않는다. */
export function ChildDashboard({ child, logs, games }: { child: Child; logs: QuestionLog[]; games: GameResult[] }) {
  if (logs.length === 0 && games.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-line px-4 py-6 text-center text-sm text-ink-soft">
        {child.nickname}의 기록이 아직 없어요. 질문이나 게임을 하나 마치면 여기에 나타나요.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <HabitStats logs={logs} games={games} />
      <p className="text-[12px] leading-relaxed text-ink-soft">
        이 숫자들은 {child.nickname}도 ‘내 습관’ 화면에서 똑같이 봐요. AI끼리 달랐던 질문이 있다면, 어떤 질문이었는지 묻기보다
        “요즘 AI가 서로 다르게 말한 적 있었어?” 정도로 가볍게 꺼내 보세요.
      </p>
    </div>
  );
}
