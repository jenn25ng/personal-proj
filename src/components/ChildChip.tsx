import Link from "next/link";
import type { Child } from "@/db/schema";

/** 상단의 작은 상태줄: 누가 쓰는지, 남은 횟수 */
export function ChildChip({ child, extra }: { child: Child; extra?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 py-2 text-[13px] text-ink-soft">
      <span className="flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-soft text-[11px] font-bold text-accent">
          {child.nickname.slice(0, 1)}
        </span>
        <span className="font-medium text-ink">{child.nickname}</span>
        <span>{child.grade}학년</span>
        {extra}
      </span>
      <Link href="/parent" className="hover:text-ink">
        사용자 바꾸기
      </Link>
    </div>
  );
}
