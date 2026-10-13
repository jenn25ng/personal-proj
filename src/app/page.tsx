import { Suspense } from "react";
import { ChildChip } from "@/components/ChildChip";
import { QuestionFlow } from "@/components/QuestionFlow";
import { QuotaChip } from "@/components/QuotaChip";
import { requireActiveChild } from "@/lib/auth";
import { LIMIT_MESSAGE, getQuota } from "@/lib/quota";

export default function Home() {
  return (
    <Suspense fallback={<p className="py-6 text-sm text-ink-soft">불러오는 중...</p>}>
      <HomeContent />
    </Suspense>
  );
}

async function HomeContent() {
  const { child } = await requireActiveChild();
  const quota = await getQuota(child);
  const left = Math.max(0, quota.questionLimit - quota.questionsUsed);
  return (
    <div className="flex flex-1 flex-col">
      <ChildChip child={child} extra={<QuotaChip quota={quota} kind="question" />} />
      {left === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
          <p className="max-w-sm text-[15px] leading-relaxed text-ink">{LIMIT_MESSAGE.question}</p>
        </div>
      ) : (
        <QuestionFlow questionsLeft={left} nickname={child.nickname} />
      )}
    </div>
  );
}
