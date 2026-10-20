import { Suspense } from "react";
import { ChildChip } from "@/components/ChildChip";
import { QuestionFlow } from "@/components/QuestionFlow";
import { QuotaChip } from "@/components/QuotaChip";
import { requireActiveChild } from "@/lib/auth";
import { getQuota } from "@/lib/quota";
import { THREAD_TURN_LIMIT, getRecentThread } from "@/lib/threads";

export default function Home() {
  return (
    <Suspense fallback={<p className="py-6 text-sm text-ink-soft">불러오는 중...</p>}>
      <HomeContent />
    </Suspense>
  );
}

async function HomeContent() {
  const { child } = await requireActiveChild();
  const [quota, recent] = await Promise.all([getQuota(child), getRecentThread(child.id)]);
  const left = Math.max(0, quota.questionLimit - quota.questionsUsed);
  const comparesLeft = Math.max(0, quota.compareLimit - quota.comparesUsed);
  return (
    <div className="flex flex-1 flex-col">
      <ChildChip child={child} extra={<QuotaChip quota={quota} kind="question" />} />
      <QuestionFlow
        questionsLeft={left}
        comparesLeft={comparesLeft}
        nickname={child.nickname}
        activeThread={recent ? { id: recent.id, topic: recent.topicLabel, turnCount: recent.turnCount } : null}
        turnLimit={THREAD_TURN_LIMIT}
      />
    </div>
  );
}
