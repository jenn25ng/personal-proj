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
      <body className="flex min-h-full flex-col bg-stone-50 text-stone-900">
        <header className="border-b border-stone-200 bg-white">
          <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
            <Link href="/" className="shrink-0 whitespace-nowrap text-lg font-extrabold text-amber-600">
              🧠 생각 먼저 AI
            </Link>
            <nav className="flex shrink-0 gap-3 whitespace-nowrap text-xs text-stone-600 sm:gap-4 sm:text-sm">
              <Link href="/" className="hover:text-stone-900">
                질문하기
              </Link>
              <Link href="/game" className="hover:text-stone-900">
                틀린 거 찾기
              </Link>
              <Link href="/parent" className="hover:text-stone-900">
                부모님 보기
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">{children}</main>
        <footer className="px-4 py-6 text-center text-xs text-stone-400">
          AI 답은 틀릴 수 있어요. 중요한 건 꼭 책이나 어른에게 확인해요.
        </footer>
      </body>
    </html>
  );
}
