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
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
      <p className="text-[15px] leading-relaxed text-ink">앗, 뭔가 잘못됐어요. 다시 해 보면 대부분 괜찮아져요.</p>
      <button type="button" onClick={retry} className="rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-white transition hover:bg-accent-deep">
        다시 해 보기
      </button>
      {error.digest && <p className="text-[11px] text-ink-soft">오류 번호 {error.digest}</p>}
    </div>
  );
}
