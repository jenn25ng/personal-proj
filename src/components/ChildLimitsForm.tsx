"use client";

import { useActionState } from "react";
import { updateChildLimits, type FormState } from "@/lib/actions";
import { Button, Field, FormNotice, inputClass } from "./ui";

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
      <div className="flex flex-wrap gap-3">
        <Field label="하루 주제 수" className="w-28">
          <input
            name="dailyQuestionLimit"
            type="number"
            min={1}
            max={max.question}
            defaultValue={questionLimit ?? ""}
            placeholder={String(defaults.question)}
            className={inputClass}
          />
        </Field>
        <Field label="하루 게임 수" className="w-28">
          <input
            name="dailyGameLimit"
            type="number"
            min={1}
            max={max.game}
            defaultValue={gameLimit ?? ""}
            placeholder={String(defaults.game)}
            className={inputClass}
          />
        </Field>
      </div>
      <p className="text-[12px] leading-relaxed text-ink-soft">
        주제는 “새로 꺼낸 이야깃거리”예요. 한 주제 안에서 이어 묻는 건 세지 않아요. 비우면 기본값(주제 {defaults.question}, 게임 {defaults.game})이에요. 최대 주제 {max.question}, 게임 {max.game}까지. 한국 시간 자정에 다시 채워져요.
      </p>
      <FormNotice state={state} />
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "저장 중..." : "한도 저장"}
      </Button>
    </form>
  );
}
