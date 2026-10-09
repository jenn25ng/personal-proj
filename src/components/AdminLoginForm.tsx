"use client";

import { useActionState } from "react";
import { adminLogin } from "@/lib/admin-actions";
import type { FormState } from "@/lib/actions";
import { Button } from "./ui";

export function AdminLoginForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(adminLogin, undefined);
  return (
    <form action={action} className="space-y-3">
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-stone-600">관리자 토큰 (ADMIN_TOKEN)</span>
        <input
          name="token"
          type="password"
          required
          autoComplete="off"
          className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-base outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
        />
      </label>
      {state?.error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800 ring-1 ring-rose-200">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "확인 중..." : "들어가기"}
      </Button>
    </form>
  );
}
