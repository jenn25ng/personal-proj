"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  requestPasswordReset,
  resendVerification,
  resetPassword,
  verifyEmail,
  type FormState,
} from "@/lib/actions";
import { Button, Field, FormNotice, inputClass } from "./ui";

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(requestPasswordReset, undefined);
  return (
    <form action={action} className="space-y-4">
      <Field label="가입한 이메일">
        <input name="email" type="email" required autoComplete="email" defaultValue={state?.values?.email} className={inputClass} />
      </Field>
      <FormNotice state={state} />
      <button type="submit" disabled={pending} className="w-full rounded-xl bg-accent py-2.5 text-sm font-medium text-white transition hover:bg-accent-deep disabled:opacity-40">
        {pending ? "보내는 중..." : "재설정 링크 보내기"}
      </button>
      <p className="text-center text-[13px] text-ink-soft">
        <Link href="/login" className="hover:text-ink hover:underline">
          로그인으로 돌아가기
        </Link>
      </p>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(resetPassword, undefined);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <Field label="새 비밀번호 (8자 이상)">
        <input name="password" type="password" required minLength={8} autoComplete="new-password" className={inputClass} />
      </Field>
      <Field label="새 비밀번호 확인">
        <input name="confirm" type="password" required minLength={8} autoComplete="new-password" className={inputClass} />
      </Field>
      <FormNotice state={state} />
      <button type="submit" disabled={pending} className="w-full rounded-xl bg-accent py-2.5 text-sm font-medium text-white transition hover:bg-accent-deep disabled:opacity-40">
        {pending ? "바꾸는 중..." : "비밀번호 바꾸기"}
      </button>
    </form>
  );
}

export function VerifyEmailForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(verifyEmail, undefined);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <FormNotice state={state} />
      <button type="submit" disabled={pending} className="w-full rounded-xl bg-accent py-2.5 text-sm font-medium text-white transition hover:bg-accent-deep disabled:opacity-40">
        {pending ? "확인 중..." : "인증 완료"}
      </button>
    </form>
  );
}

export function ResendVerificationForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(resendVerification, undefined);
  return (
    <form action={action} className="space-y-2">
      <FormNotice state={state} />
      <Button type="submit" size="sm" variant="secondary" disabled={pending}>
        {pending ? "보내는 중..." : "인증 메일 다시 보내기"}
      </Button>
    </form>
  );
}
