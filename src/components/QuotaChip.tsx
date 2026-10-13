import type { Quota } from "@/lib/quota";

export function QuotaChip({ quota, kind }: { quota: Quota; kind: "question" | "game" }) {
  const used = kind === "question" ? quota.questionsUsed : quota.gamesUsed;
  const limit = kind === "question" ? quota.questionLimit : quota.gameLimit;
  const left = Math.max(0, limit - used);
  const label = kind === "question" ? "질문" : "게임";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${left === 0 ? "bg-surface-2 text-ink-soft" : "bg-surface text-ink-soft"}`}>
      오늘 남은 {label} {left}
      {kind === "question" ? "개" : "판"}
    </span>
  );
}
