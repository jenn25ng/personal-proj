"use client";

import { useActionState } from "react";
import { sendTestError } from "@/lib/admin-actions";
import type { FormState } from "@/lib/actions";
import { buttonClass } from "./ui";

export function TestErrorButton() {
  const [state, action, pending] = useActionState<FormState, FormData>(sendTestError, undefined);
  return (
    <form action={action} className="space-y-2">
      <button type="submit" disabled={pending} className={buttonClass("secondary", "sm")}>
        {pending ? "보내는 중..." : "테스트 오류 보내기"}
      </button>
      {state?.ok && <p className="text-[12px] text-ok">{state.ok}</p>}
    </form>
  );
}
