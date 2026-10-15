"use client";

import { useActionState } from "react";
import { addChild, type FormState } from "@/lib/actions";
import { Button, Field, FormNotice, buttonClass, inputClass } from "./ui";

export function AddChildForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(addChild, undefined);
  return (
    <form action={action} className="space-y-3">
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <Field label="아이 별명">
          <input name="nickname" required maxLength={20} placeholder="예) 민수" defaultValue={state?.values?.nickname} className={inputClass} />
        </Field>
        <Field label="학년">
          <select name="grade" defaultValue={state?.values?.grade ?? "5"} className={inputClass}>
            <option value="4">4학년</option>
            <option value="5">5학년</option>
            <option value="6">6학년</option>
          </select>
        </Field>
      </div>
      <p className="text-[12px] leading-relaxed text-ink-soft">
        부모님은 아이가 몇 번 질문했는지, 먼저 생각했는지 같은 <span className="text-ink">숫자만</span> 볼 수 있어요. 질문 내용은
        보이지 않아요. 아이도 같은 숫자를 봐요.
      </p>
      <label className="flex items-start gap-2.5 rounded-xl bg-surface p-3 text-[12px] leading-relaxed text-ink-soft">
        <input type="checkbox" name="consent" required className="mt-0.5 accent-accent" />
        <span>
          저는 이 아이의 법정대리인이며, 만 14세 미만 아동의 개인정보(별명, 학년, 이 서비스에서의 질문·예상·정리 기록)를
          위에 적힌 목적으로 수집·이용하는 것에 동의합니다. 동의는 계정 또는 프로필을 지우면 철회돼요.
        </span>
      </label>
      <FormNotice state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? "만드는 중..." : "아이 프로필 만들기"}
      </Button>
    </form>
  );
}

/** confirm()을 거친 뒤에만 제출되는 버튼. 서버 액션 폼 안에서 쓴다. */
export function ConfirmSubmit({
  message,
  children,
  variant = "danger",
}: {
  message: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "danger";
}) {
  return (
    <button
      type="submit"
      className={buttonClass(variant, "sm")}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
