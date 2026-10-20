"use client";

import { useActionState } from "react";
import { updateDistressAlert, type FormState } from "@/lib/actions";
import { Button, FormNotice } from "./ui";

export function DistressAlertForm({ on }: { on: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateDistressAlert, undefined);
  return (
    <form action={action} className="space-y-3">
      <label className="flex items-start gap-2.5 text-sm text-ink">
        <input type="checkbox" name="alertOnDistress" defaultChecked={on} className="mt-0.5 accent-accent" />
        <span>
          힘든 신호가 보이면 메일로 알려 주세요
          <span className="block text-[12px] leading-relaxed text-ink-soft">끄면 아이에게 돌봄 안내만 보여 주고 부모님께는 알리지 않아요. 그 선택의 책임은 부모님께 있어요.</span>
        </span>
      </label>
      <FormNotice state={state} />
      <Button type="submit" variant="secondary" size="sm" disabled={pending}>
        {pending ? "저장 중..." : "저장"}
      </Button>
    </form>
  );
}
