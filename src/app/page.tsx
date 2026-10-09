import Link from "next/link";
import { Suspense } from "react";
import { ChildChip } from "@/components/ChildChip";
import { QuestionFlow } from "@/components/QuestionFlow";
import { requireActiveChild } from "@/lib/auth";

export default function Home() {
  return (
    <Suspense fallback={<p className="text-sm text-stone-500">불러오는 중...</p>}>
      <HomeContent />
    </Suspense>
  );
}

async function HomeContent() {
  const { child } = await requireActiveChild();
  return (
    <div className="space-y-5">
      <ChildChip child={child} />
      <div>
        <h1 className="text-2xl font-extrabold text-stone-900">궁금한 게 있어요?</h1>
        <p className="mt-1 text-sm text-stone-600">바로 답을 보기 전에 한 번 생각해 보고, AI 답은 꼭 확인해 봐요.</p>
      </div>
      <QuestionFlow />
      <Link
        href="/game"
        className="block rounded-2xl bg-amber-100 p-4 text-sm text-amber-900 ring-1 ring-amber-200 hover:bg-amber-200"
      >
        🕵️ <span className="font-bold">틀린 거 찾기 게임</span> · AI가 일부러 틀린 문장을 숨겨요. 찾아낼 수 있을까요?
      </Link>
    </div>
  );
}
