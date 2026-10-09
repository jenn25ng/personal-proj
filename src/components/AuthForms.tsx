"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, signup, type FormState } from "@/lib/actions";
import { Button } from "./ui";

const inputCls =
  "w-full rounded-xl border border-stone-300 px-3 py-2.5 text-base outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-200";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-stone-600">{label}</span>
      {children}
    </label>
  );
}

export function LoginForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(login, undefined);
  return (
    <form action={action} className="space-y-4">
      <Field label="이메일">
        <input name="email" type="email" required autoComplete="email" className={inputCls} />
      </Field>
      <Field label="비밀번호">
        <input name="password" type="password" required autoComplete="current-password" className={inputCls} />
      </Field>
      {state?.error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800 ring-1 ring-rose-200">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "확인 중..." : "로그인"}
      </Button>
      <p className="text-sm text-stone-600">
        아직 계정이 없나요?{" "}
        <Link href="/signup" className="font-semibold text-amber-700 underline">
          부모 계정 만들기
        </Link>
      </p>
    </form>
  );
}

export function SignupForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(signup, undefined);
  return (
    <form action={action} className="space-y-4">
      <Field label="이름 또는 별명">
        <input name="name" required maxLength={40} className={inputCls} />
      </Field>
      <Field label="이메일">
        <input name="email" type="email" required autoComplete="email" className={inputCls} />
      </Field>
      <Field label="비밀번호 (8자 이상)">
        <input name="password" type="password" required minLength={8} autoComplete="new-password" className={inputCls} />
      </Field>
      <p className="rounded-xl bg-stone-100 p-3 text-xs leading-relaxed text-stone-600">
        수집하는 정보는 부모의 이메일·이름, 아이의 별명·학년, 그리고 아이가 이 서비스에서 한 질문·예상·정리 기록이에요.
        아이 기록은 부모님 화면에서만 볼 수 있고, 계정을 지우면 모든 기록이 함께 지워져요. 질문 내용은 답변을 만들기
        위해 AI 제공사(Anthropic, Google, OpenAI)에 전송돼요.
      </p>
      {state?.error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800 ring-1 ring-rose-200">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "만드는 중..." : "계정 만들기"}
      </Button>
      <p className="text-sm text-stone-600">
        이미 계정이 있나요?{" "}
        <Link href="/login" className="font-semibold text-amber-700 underline">
          로그인
        </Link>
      </p>
    </form>
  );
}
