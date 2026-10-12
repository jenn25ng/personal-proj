"use client";

/** 루트 레이아웃까지 깨졌을 때의 마지막 보루. 스타일 없이도 읽히게 둔다. */
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="ko">
      <body style={{ fontFamily: "sans-serif", padding: 24, textAlign: "center" }}>
        <p style={{ fontSize: 32 }}>🙈</p>
        <p>앗, 뭔가 잘못됐어요. 다시 해 보면 대부분 괜찮아져요.</p>
        <button type="button" onClick={retry} style={{ padding: "10px 16px", borderRadius: 12, border: "none", background: "#f59e0b", color: "white", fontWeight: 600 }}>
          다시 해 보기
        </button>
        {error.digest && <p style={{ color: "#999", fontSize: 12 }}>오류 번호 {error.digest}</p>}
      </body>
    </html>
  );
}
