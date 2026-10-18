"use client";

import { useActionState } from "react";
import { adminLogin } from "@/lib/admin-actions";
import type { FormState } from "@/lib/actions";
import { Button, Field, FormNotice, inputClass } from "./ui";

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
      <Button type="submit" disabled={pending}>
        {pending ? "확인 중..." : "들어가기"}
      </Button>
    </form>
  );
}
