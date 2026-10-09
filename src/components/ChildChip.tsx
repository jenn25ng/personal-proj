import Link from "next/link";
import type { Child } from "@/db/schema";

export function ChildChip({ child }: { child: Child }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-sm ring-1 ring-stone-200">
      <span className="text-stone-700">
        지금 쓰는 사람: <span className="font-bold text-stone-900">{child.nickname}</span>
        <span className="ml-1 text-xs text-stone-400">{child.grade}학년</span>
      </span>
      <Link href="/parent" className="text-xs font-semibold text-amber-700 underline">
        바꾸기
      </Link>
    </div>
  );
}
