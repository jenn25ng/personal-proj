import type { Metadata } from "next";
import Link from "next/link";
import "@fontsource/jua/400.css";
import "@fontsource/gowun-dodum/400.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "생각 먼저 AI",
  description: "초등 고학년 어린이가 스스로 생각한 뒤 AI에게 묻고, AI 답을 의심하고 확인하는 습관을 기르는 서비스",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="flex min-h-full flex-col text-ink">
        <header className="sticky top-0 z-10 border-b-2 border-line bg-paper/90 backdrop-blur">
          <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-2.5">
            <Link href="/" className="flex shrink-0 items-center gap-1.5 whitespace-nowrap">
              <span className="sticker h-7 w-7 bg-sun text-base">💡</span>
              <span className="font-display text-xl text-ink">생각 먼저 AI</span>
            </Link>
            <nav className="flex shrink-0 gap-1 whitespace-nowrap text-sm">
              <Link href="/" className="rounded-xl px-2.5 py-1.5 text-ink-soft hover:bg-sun-soft hover:text-ink">
                질문하기
              </Link>
              <Link href="/game" className="rounded-xl px-2.5 py-1.5 text-ink-soft hover:bg-sun-soft hover:text-ink">
                틀린 거 찾기
              </Link>
              <Link href="/parent" className="rounded-xl px-2.5 py-1.5 text-ink-soft hover:bg-sun-soft hover:text-ink">
                가족 기록
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-5">{children}</main>
        <footer className="space-y-1 px-4 py-6 text-center text-xs text-ink-soft">
          <p>AI 답은 틀릴 수 있어요. 중요한 건 꼭 책이나 어른에게 확인해요.</p>
          <p>
            <Link href="/privacy" className="underline">
              개인정보 처리방침
            </Link>
          </p>
        </footer>
      </body>
    </html>
  );
}
