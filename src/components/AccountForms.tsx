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
import { Button } from "./ui";

const inputCls =
  "w-full rounded-xl border border-stone-300 px-3 py-2.5 text-base outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-200";

function Notice({ state }: { state: FormState }) {
  if (!state) return null;
  return (
    <div className="space-y-2">
      {state.error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800 ring-1 ring-rose-200">{state.error}</p>}
      {state.ok && <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800 ring-1 ring-emerald-200">{state.ok}</p>}
      {state.devLink && (
        <p className="rounded-xl bg-stone-100 p-3 text-xs text-stone-600">
          개발 모드: 메일 서버(SMTP_URL)가 없어 링크를 여기와 서버 콘솔에 보여 줘요.{" "}
          <a href={state.devLink} className="break-all font-semibold text-amber-700 underline">
            {state.devLink}
          </a>
        </p>
      )}
    </div>
  );
}

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(requestPasswordReset, undefined);
  return (
    <form action={action} className="space-y-4">
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-stone-600">가입한 이메일</span>
        <input name="email" type="email" required autoComplete="email" defaultValue={state?.values?.email} className={inputCls} />
      </label>
      <Notice state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? "보내는 중..." : "재설정 링크 보내기"}
      </Button>
      <p className="text-sm text-stone-600">
        <Link href="/login" className="font-semibold text-amber-700 underline">
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
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-stone-600">새 비밀번호 (8자 이상)</span>
        <input name="password" type="password" required minLength={8} autoComplete="new-password" className={inputCls} />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-stone-600">새 비밀번호 확인</span>
        <input name="confirm" type="password" required minLength={8} autoComplete="new-password" className={inputCls} />
      </label>
      <Notice state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? "바꾸는 중..." : "비밀번호 바꾸기"}
      </Button>
    </form>
  );
}

export function VerifyEmailForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(verifyEmail, undefined);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <Notice state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? "확인 중..." : "인증 완료"}
      </Button>
    </form>
  );
}

export function ResendVerificationForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(resendVerification, undefined);
  return (
    <form action={action} className="space-y-2">
      <Notice state={state} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-amber-500 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-40"
      >
        {pending ? "보내는 중..." : "인증 메일 다시 보내기"}
      </button>
    </form>
  );
}
