import { Suspense } from "react";
import { LoginForm } from "@/components/AuthForms";
import { AuthShell } from "@/components/AuthShell";
import { Notice } from "@/components/ui";

type Search = Promise<{ reset?: string }>;

export default function LoginPage({ searchParams }: { searchParams: Search }) {
  return (
    <AuthShell title="부모님 로그인" description="아이가 쓰기 전에 부모님이 먼저 로그인하고 아이 프로필을 골라 주세요.">
      <Suspense fallback={null}>
        <ResetNotice searchParams={searchParams} />
      </Suspense>
      <LoginForm />
    </AuthShell>
  );
}

async function ResetNotice({ searchParams }: { searchParams: Search }) {
  const { reset } = await searchParams;
  if (!reset) return null;
  return (
    <div className="mb-4">
      <Notice kind="ok">비밀번호를 바꿨어요. 새 비밀번호로 로그인해 주세요.</Notice>
    </div>
  );
}
