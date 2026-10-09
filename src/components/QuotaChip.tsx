import type { Quota } from "@/lib/quota";

/** 아이에게 보여 주는 "오늘 남은 횟수". 숫자는 담담하게, 다 쓰면 부드럽게. */
export function QuotaChip({ quota, kind }: { quota: Quota; kind: "question" | "game" }) {
  const used = kind === "question" ? quota.questionsUsed : quota.gamesUsed;
  const limit = kind === "question" ? quota.questionLimit : quota.gameLimit;
  const left = Math.max(0, limit - used);
  const label = kind === "question" ? "질문" : "게임";
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${left === 0 ? "bg-stone-200 text-stone-600" : "bg-emerald-100 text-emerald-800"}`}>
      오늘 남은 {label} {left}
      {kind === "question" ? "개" : "판"}
    </span>
  );
}
