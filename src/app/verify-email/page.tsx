import Link from "next/link";
import { Suspense } from "react";
import { VerifyEmailForm } from "@/components/AccountForms";
import { Card } from "@/components/ui";

type Search = Promise<{ token?: string }>;

export default function VerifyEmailPage({ searchParams }: { searchParams: Search }) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-stone-900">이메일 인증</h1>
        <p className="mt-1 text-sm text-stone-600">아래 버튼을 누르면 인증이 끝나요.</p>
      </div>
      <Card>
        <Suspense fallback={<p className="text-sm text-stone-500">불러오는 중...</p>}>
          <Content searchParams={searchParams} />
        </Suspense>
      </Card>
    </div>
  );
}

async function Content({ searchParams }: { searchParams: Search }) {
  const { token } = await searchParams;
  if (!token) {
    return (
      <p className="text-sm text-stone-600">
        링크가 올바르지 않아요.{" "}
        <Link href="/parent" className="font-semibold text-amber-700 underline">
          부모님 화면에서 인증 메일 다시 받기
        </Link>
      </p>
    );
  }
  return <VerifyEmailForm token={token} />;
}
