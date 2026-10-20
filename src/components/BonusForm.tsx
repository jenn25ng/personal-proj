"use client";

import { useActionState } from "react";
import { grantBonus, type FormState } from "@/lib/actions";
import { FormNotice, buttonClass } from "./ui";

/** 한도를 넘은 날 "오늘만" 더 열어 주는 버튼들. 저장된 한도는 바꾸지 않는다. */
export function BonusForm({ childId }: { childId: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(grantBonus, undefined);
  const btn = buttonClass("secondary", "sm");
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="childId" value={childId} />
      <div className="flex flex-wrap gap-2">
        <button type="submit" name="questions" value="1" disabled={pending} className={btn}>
          주제 +1
        </button>
        <button type="submit" name="questions" value="3" disabled={pending} className={btn}>
          주제 +3
        </button>
        <button type="submit" name="games" value="1" disabled={pending} className={btn}>
          게임 +1
        </button>
      </div>
      <FormNotice state={state} />
    </form>
  );
}
