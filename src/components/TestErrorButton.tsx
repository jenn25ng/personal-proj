"use client";

import { useActionState } from "react";
import { sendTestError } from "@/lib/admin-actions";
import type { FormState } from "@/lib/actions";

export function TestErrorButton() {
  const [state, action, pending] = useActionState<FormState, FormData>(sendTestError, undefined);
  return (
    <form action={action} className="space-y-2">
      <button type="submit" disabled={pending} className="rounded-xl bg-stone-100 px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-200 disabled:opacity-40">
        {pending ? "보내는 중..." : "테스트 오류 보내기"}
      </button>
      {state?.ok && <p className="text-xs text-emerald-700">{state.ok}</p>}
    </form>
  );
}
