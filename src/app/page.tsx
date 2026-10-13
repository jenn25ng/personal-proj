import Link from "next/link";
import { Suspense } from "react";
import { ChildChip } from "@/components/ChildChip";
import { Mascot } from "@/components/Mascot";
import { QuestionFlow } from "@/components/QuestionFlow";
import { QuotaChip } from "@/components/QuotaChip";
import { requireActiveChild } from "@/lib/auth";
import { LIMIT_MESSAGE, getQuota } from "@/lib/quota";

export default function Home() {
  return (
    <Suspense fallback={<p className="text-sm text-ink-soft">불러오는 중...</p>}>
      <HomeContent />
    </Suspense>
  );
}

async function HomeContent() {
  const { child } = await requireActiveChild();
  const quota = await getQuota(child);
  const left = Math.max(0, quota.questionLimit - quota.questionsUsed);
  return (
    <div className="space-y-5">
      <ChildChip child={child} extra={<QuotaChip quota={quota} kind="question" />} />

      <div className="flex items-end gap-3">
        <Mascot mood={left === 0 ? "sleepy" : "curious"} size={72} className="bob shrink-0" />
        <div className="pb-1">
          <h1 className="font-display text-[26px] leading-tight text-ink">
            {child.nickname}, 오늘은 뭐가 궁금해?
          </h1>
          <p className="mt-1 text-sm text-ink-soft">바로 답을 보기 전에 한 번 생각해 보고, AI 답은 꼭 확인해 봐요.</p>
        </div>
      </div>

      {left === 0 ? (
        <div className="paper p-5 text-[15px] leading-relaxed text-ink">🌙 {LIMIT_MESSAGE.question}</div>
      ) : (
        <QuestionFlow questionsLeft={left} />
      )}

      <Link href="/game" className="paper flex items-center gap-3 p-4 hover:bg-sun-soft">
        <span className="sticker sticker-alt h-11 w-11 bg-sky text-2xl">🕵️</span>
        <span>
          <span className="block font-display text-lg text-ink">틀린 거 찾기 게임</span>
          <span className="block text-sm text-ink-soft">AI가 일부러 틀린 문장을 숨겨요. 찾아낼 수 있을까요?</span>
        </span>
      </Link>
    </div>
  );
}
