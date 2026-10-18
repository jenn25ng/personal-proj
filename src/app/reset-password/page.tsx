import Link from "next/link";
import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/AccountForms";
import { AuthShell } from "@/components/AuthShell";

type Search = Promise<{ token?: string }>;

export default function ResetPasswordPage({ searchParams }: { searchParams: Search }) {
  return (
    <AuthShell title="새 비밀번호 정하기" description="바꾸고 나면 모든 기기에서 다시 로그인해야 해요.">
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
        <Link href="/forgot-password" className="text-accent underline">
          재설정을 다시 요청하기
        </Link>
      </p>
    );
  }
  return <ResetPasswordForm token={token} />;
}
