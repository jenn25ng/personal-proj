"use client";

import { useActionState } from "react";
import { updateChildLimits, type FormState } from "@/lib/actions";
import { Button } from "./ui";

const inputCls =
  "w-24 rounded-xl border border-stone-300 px-3 py-2 text-base outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-200";

export function ChildLimitsForm({
  childId,
  questionLimit,
  gameLimit,
  defaults,
  max,
}: {
  childId: string;
  questionLimit: number | null;
  gameLimit: number | null;
  defaults: { question: number; game: number };
  max: { question: number; game: number };
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateChildLimits, undefined);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="childId" value={childId} />
      <div className="flex flex-wrap gap-4">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-stone-600">하루 질문 수</span>
          <input
            name="dailyQuestionLimit"
            type="number"
            min={1}
            max={max.question}
            defaultValue={questionLimit ?? ""}
            placeholder={String(defaults.question)}
            className={inputCls}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-stone-600">하루 게임 수</span>
          <input
            name="dailyGameLimit"
            type="number"
            min={1}
            max={max.game}
            defaultValue={gameLimit ?? ""}
            placeholder={String(defaults.game)}
            className={inputCls}
          />
        </label>
      </div>
      <p className="text-xs text-stone-500">
        비우면 기본값(질문 {defaults.question}, 게임 {defaults.game})이에요. 최대 질문 {max.question}, 게임 {max.game}까지. 한국 시간
        자정에 다시 채워져요.
      </p>
      {state?.error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800 ring-1 ring-rose-200">{state.error}</p>}
      {state?.ok && <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800 ring-1 ring-emerald-200">{state.ok}</p>}
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "저장 중..." : "한도 저장"}
      </Button>
    </form>
  );
}
