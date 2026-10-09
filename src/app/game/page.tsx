import { Suspense } from "react";
import { ChildChip } from "@/components/ChildChip";
import { FindMistakeGame } from "@/components/FindMistakeGame";
import { QuotaChip } from "@/components/QuotaChip";
import { requireActiveChild } from "@/lib/auth";
import { LIMIT_MESSAGE, getQuota } from "@/lib/quota";

export default function GamePage() {
  return (
    <Suspense fallback={<p className="text-sm text-stone-500">불러오는 중...</p>}>
      <GameContent />
    </Suspense>
  );
}

async function GameContent() {
  const { child } = await requireActiveChild();
  const quota = await getQuota(child.id);
  const left = Math.max(0, quota.gameLimit - quota.gamesUsed);
  return (
    <div className="space-y-5">
      <ChildChip child={child} extra={<QuotaChip quota={quota} kind="game" />} />
      <div>
        <h1 className="text-2xl font-extrabold text-stone-900">🕵️ 틀린 거 찾기</h1>
        <p className="mt-1 text-sm text-stone-600">AI는 가끔 틀린 말을 아주 자신 있게 해요. 그걸 알아채는 연습이에요.</p>
      </div>
      {left === 0 ? (
        <div className="rounded-2xl bg-white p-5 text-[15px] leading-relaxed text-stone-800 ring-1 ring-stone-200">
          🌙 {LIMIT_MESSAGE.game}
        </div>
      ) : (
        <FindMistakeGame />
      )}
    </div>
  );
}
