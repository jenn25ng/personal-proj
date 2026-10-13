import type { Quota } from "@/lib/quota";

export function QuotaChip({ quota, kind }: { quota: Quota; kind: "question" | "game" }) {
  const used = kind === "question" ? quota.questionsUsed : quota.gamesUsed;
  const limit = kind === "question" ? quota.questionLimit : quota.gameLimit;
  const left = Math.max(0, limit - used);
  const label = kind === "question" ? "질문" : "게임";
  return (
    <span className={`sticker sticker-alt px-2.5 py-0.5 text-xs ${left === 0 ? "bg-line text-ink-soft" : "bg-leaf-soft text-leaf"}`}>
      오늘 남은 {label} {left}
      {kind === "question" ? "개" : "판"}
    </span>
  );
}
