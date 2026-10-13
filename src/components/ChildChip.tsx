import Link from "next/link";
import type { Child } from "@/db/schema";

/** 공책 표지의 이름표처럼 */
export function ChildChip({ child, extra }: { child: Child; extra?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border-1.5 border-dashed border-line bg-paper/70 px-3 py-2 text-sm">
      <span className="flex items-center gap-2">
        <span className="font-display text-base text-ink">
          {child.nickname}
          <span className="ml-1 text-xs text-ink-soft">{child.grade}학년</span>
        </span>
        {extra}
      </span>
      <span className="flex gap-3 text-xs">
        <Link href="/me" className="text-tangerine-deep underline">
          내 습관
        </Link>
        <Link href="/parent" className="text-ink-soft underline">
          바꾸기
        </Link>
      </span>
    </div>
  );
}
