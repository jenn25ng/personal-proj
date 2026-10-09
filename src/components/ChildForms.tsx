"use client";

import { useActionState } from "react";
import { addChild, type FormState } from "@/lib/actions";
import { Button } from "./ui";

const inputCls =
  "w-full rounded-xl border border-stone-300 px-3 py-2.5 text-base outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-200";

export function AddChildForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(addChild, undefined);
  return (
    <form action={action} className="space-y-3">
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-stone-600">아이 별명</span>
          <input name="nickname" required maxLength={20} placeholder="예) 민수" defaultValue={state?.values?.nickname} className={inputCls} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-stone-600">학년</span>
          <select name="grade" defaultValue={state?.values?.grade ?? "5"} className={inputCls}>
            <option value="4">4학년</option>
            <option value="5">5학년</option>
            <option value="6">6학년</option>
          </select>
        </label>
      </div>
      <label className="flex items-start gap-2 rounded-xl bg-stone-100 p-3 text-xs leading-relaxed text-stone-700">
        <input type="checkbox" name="consent" required className="mt-0.5" />
        <span>
          저는 이 아이의 법정대리인이며, 만 14세 미만 아동의 개인정보(별명, 학년, 이 서비스에서의 질문·예상·정리 기록)를
          위에 적힌 목적으로 수집·이용하는 것에 동의합니다. 동의는 계정 또는 프로필을 지우면 철회돼요.
        </span>
      </label>
      {state?.error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800 ring-1 ring-rose-200">{state.error}</p>}
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
  variant = "secondary",
}: {
  message: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
}) {
  const base = "rounded-xl px-3 py-2 text-xs font-semibold transition";
  const cls = variant === "primary" ? "bg-amber-500 text-white hover:bg-amber-600" : "bg-stone-100 text-stone-600 hover:bg-rose-100 hover:text-rose-800";
  return (
    <button
      type="submit"
      className={`${base} ${cls}`}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
