import Link from "next/link";
import type { Child } from "@/db/schema";

export function ChildChip({ child }: { child: Child }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 text-sm ring-1 ring-stone-200">
      <span className="text-stone-700">
        지금 쓰는 사람: <span className="font-bold text-stone-900">{child.nickname}</span>
        <span className="ml-1 text-xs text-stone-400">{child.grade}학년</span>
      </span>
      <span className="flex gap-3 text-xs font-semibold">
        <Link href="/me" className="text-amber-700 underline">
          내 습관
        </Link>
        <Link href="/parent" className="text-stone-500 underline">
          바꾸기
        </Link>
      </span>
    </div>
  );
}
