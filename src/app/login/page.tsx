import { Suspense } from "react";
import { LoginForm } from "@/components/AuthForms";
import { Card } from "@/components/ui";

type Search = Promise<{ reset?: string }>;

export default function LoginPage({ searchParams }: { searchParams: Search }) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-stone-900">부모님 로그인</h1>
        <p className="mt-1 text-sm text-stone-600">아이가 쓰기 전에 부모님이 먼저 로그인하고 아이 프로필을 골라 주세요.</p>
      </div>
      <Suspense fallback={null}>
        <ResetNotice searchParams={searchParams} />
      </Suspense>
      <Card>
        <LoginForm />
      </Card>
    </div>
  );
}

async function ResetNotice({ searchParams }: { searchParams: Search }) {
  const { reset } = await searchParams;
  if (!reset) return null;
  return (
    <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800 ring-1 ring-emerald-200">
      비밀번호를 바꿨어요. 새 비밀번호로 로그인해 주세요.
    </p>
  );
}
