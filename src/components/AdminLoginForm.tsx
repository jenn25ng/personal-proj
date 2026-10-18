"use client";

import { useActionState } from "react";
import { adminLogin } from "@/lib/admin-actions";
import type { FormState } from "@/lib/actions";
import { Field, FormNotice, inputClass } from "./ui";

export function AdminLoginForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(adminLogin, undefined);
  return (
    <form action={action} className="space-y-3">
      <Field label="관리자 토큰 (ADMIN_TOKEN)">
        <input
          name="token"
          type="password"
          required
          autoComplete="off"
          className={inputClass}
        />
      </Field>
      <FormNotice state={state} />
      <button type="submit" disabled={pending} className="w-full rounded-xl bg-accent py-2.5 text-sm font-medium text-white transition hover:bg-accent-deep disabled:opacity-40">
        {pending ? "확인 중..." : "들어가기"}
      </button>
    </form>
  );
}
