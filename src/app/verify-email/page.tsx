import Link from "next/link";
import { Suspense } from "react";
import { VerifyEmailForm } from "@/components/AccountForms";
import { AuthShell } from "@/components/AuthShell";

type Search = Promise<{ token?: string }>;

export default function VerifyEmailPage({ searchParams }: { searchParams: Search }) {
  return (
    <AuthShell title="이메일 인증" description="아래 버튼을 누르면 인증이 끝나요.">
      <Suspense fallback={<p className="text-sm text-ink-soft">불러오는 중...</p>}>
        <Content searchParams={searchParams} />
      </Suspense>
    </AuthShell>
  );
}

async function Content({ searchParams }: { searchParams: Search }) {
  const { token } = await searchParams;
  if (!token) {
    return (
      <p className="text-sm text-ink-soft">
        링크가 올바르지 않아요.{" "}
        <Link href="/parent" className="text-accent underline">
          부모님 화면에서 인증 메일 다시 받기
        </Link>
      </p>
    );
  }
  return <VerifyEmailForm token={token} />;
}
