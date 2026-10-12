"use client";

import { useEffect } from "react";

/** 페이지 렌더 중 오류가 나면 아이에게 겁주지 않는 화면을 보여 주고, 서버에 조용히 보고한다. */
export default function ErrorPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    fetch("/api/monitor/client", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: error.message, stack: error.stack, digest: error.digest, url: window.location.href }),
    }).catch(() => {});
  }, [error]);

  return (
    <div className="space-y-4 rounded-2xl bg-white p-6 text-center ring-1 ring-stone-200">
      <p className="text-3xl">🙈</p>
      <p className="text-[15px] leading-relaxed text-stone-800">앗, 뭔가 잘못됐어요. 다시 해 보면 대부분 괜찮아져요.</p>
      <button
        type="button"
        onClick={retry}
        className="rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-600"
      >
        다시 해 보기
      </button>
      {error.digest && <p className="text-xs text-stone-400">오류 번호 {error.digest}</p>}
    </div>
  );
}
