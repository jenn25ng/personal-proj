"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, signup, type FormState } from "@/lib/actions";
import { Field, FormNotice, inputClass } from "./ui";

export function LoginForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(login, undefined);
  return (
    <form action={action} className="space-y-4">
      <Field label="이메일">
        <input name="email" type="email" required autoComplete="email" defaultValue={state?.values?.email} className={inputClass} />
      </Field>
      <Field label="비밀번호">
        <input name="password" type="password" required autoComplete="current-password" className={inputClass} />
      </Field>
      <FormNotice state={state} />
      <button type="submit" disabled={pending} className="w-full rounded-xl bg-accent py-2.5 text-sm font-medium text-white transition hover:bg-accent-deep disabled:opacity-40">
        {pending ? "확인 중..." : "로그인"}
      </button>
      <div className="flex items-center justify-between text-[13px] text-ink-soft">
        <Link href="/forgot-password" className="hover:text-ink hover:underline">
          비밀번호를 잊었어요
        </Link>
        <Link href="/signup" className="text-accent hover:underline">
          부모 계정 만들기
        </Link>
      </div>
    </form>
  );
}

export function SignupForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(signup, undefined);
  return (
    <form action={action} className="space-y-4">
      <Field label="이름 또는 별명">
        <input name="name" required maxLength={40} defaultValue={state?.values?.name} className={inputClass} />
      </Field>
      <Field label="이메일">
        <input name="email" type="email" required autoComplete="email" defaultValue={state?.values?.email} className={inputClass} />
      </Field>
      <Field label="비밀번호 (8자 이상)">
        <input name="password" type="password" required minLength={8} autoComplete="new-password" className={inputClass} />
      </Field>
      <p className="text-[12px] leading-relaxed text-ink-soft">
        수집하는 정보는 부모의 이메일·이름, 아이의 별명·학년, 그리고 아이가 이 서비스에서 한 질문·예상·정리 기록이에요. 아이
        기록은 아이 본인 화면에서만 볼 수 있고, 계정을 지우면 모든 기록이 함께 지워져요. 질문 내용은 답변을 만들기 위해 미국에
        있는 AI 제공사(Anthropic, Google, OpenAI)에 전송돼요. 자세한 내용은{" "}
        <Link href="/privacy" className="text-ink underline">
          개인정보 처리방침
        </Link>
        에 있어요.
      </p>
      <FormNotice state={state} />
      <button type="submit" disabled={pending} className="w-full rounded-xl bg-accent py-2.5 text-sm font-medium text-white transition hover:bg-accent-deep disabled:opacity-40">
        {pending ? "만드는 중..." : "계정 만들기"}
      </button>
      <p className="text-center text-[13px] text-ink-soft">
        이미 계정이 있나요?{" "}
        <Link href="/login" className="text-accent hover:underline">
          로그인
        </Link>
      </p>
    </form>
  );
}
