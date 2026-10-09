import Link from "next/link";
import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/AccountForms";
import { Card } from "@/components/ui";

type Search = Promise<{ token?: string }>;

export default function ResetPasswordPage({ searchParams }: { searchParams: Search }) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-stone-900">새 비밀번호 정하기</h1>
        <p className="mt-1 text-sm text-stone-600">바꾸고 나면 모든 기기에서 다시 로그인해야 해요.</p>
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
        <Link href="/forgot-password" className="font-semibold text-amber-700 underline">
          재설정을 다시 요청하기
        </Link>
      </p>
    );
  }
  return <ResetPasswordForm token={token} />;
}
