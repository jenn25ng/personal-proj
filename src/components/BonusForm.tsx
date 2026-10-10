"use client";

import { useActionState } from "react";
import { grantBonus, type FormState } from "@/lib/actions";

const btn = "rounded-xl bg-amber-100 px-3 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-200 disabled:opacity-40";

/** 한도를 넘은 날 "오늘만" 더 열어 주는 버튼들. 저장된 한도는 바꾸지 않는다. */
export function BonusForm({ childId }: { childId: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(grantBonus, undefined);
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="childId" value={childId} />
      <div className="flex flex-wrap gap-2">
        <button type="submit" name="questions" value="1" disabled={pending} className={btn}>
          질문 +1
        </button>
        <button type="submit" name="questions" value="3" disabled={pending} className={btn}>
          질문 +3
        </button>
        <button type="submit" name="games" value="1" disabled={pending} className={btn}>
          게임 +1
        </button>
      </div>
      {state?.error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800 ring-1 ring-rose-200">{state.error}</p>}
      {state?.ok && <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800 ring-1 ring-emerald-200">{state.ok}</p>}
    </form>
  );
}
