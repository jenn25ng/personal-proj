import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "생각 먼저 AI",
  description: "초등 고학년 어린이가 스스로 생각한 뒤 AI에게 묻고, AI 답을 의심하고 확인하는 습관을 기르는 서비스",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="flex min-h-full flex-col text-ink">
        <header className="sticky top-0 z-10 border-b border-line bg-bg/90 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-2.5">
            <Link href="/" className="shrink-0 whitespace-nowrap text-[15px] font-semibold tracking-tight text-ink">
              생각 먼저 AI
            </Link>
            <nav className="flex shrink-0 gap-0.5 whitespace-nowrap text-[13px]">
              <Link href="/" className="rounded-lg px-2.5 py-1.5 text-ink-soft hover:bg-surface hover:text-ink">
                질문
              </Link>
              <Link href="/game" className="rounded-lg px-2.5 py-1.5 text-ink-soft hover:bg-surface hover:text-ink">
                틀린 거 찾기
              </Link>
              <Link href="/me" className="rounded-lg px-2.5 py-1.5 text-ink-soft hover:bg-surface hover:text-ink">
                내 습관
              </Link>
              <Link href="/parent" className="rounded-lg px-2.5 py-1.5 text-ink-soft hover:bg-surface hover:text-ink">
                가족
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4">{children}</main>
        <footer className="space-y-1 px-4 py-4 text-center text-[11px] text-ink-soft">
          <p>
            AI 답은 틀릴 수 있어요. 중요한 건 꼭 책이나 어른에게 확인해요. ·{" "}
            <Link href="/privacy" className="underline">
              개인정보 처리방침
            </Link>
          </p>
        </footer>
      </body>
    </html>
  );
}
