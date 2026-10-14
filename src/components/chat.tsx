"use client";

/** 대화형 화면의 공용 부품. 홈(질문)과 게임이 같은 것을 쓴다. */

export function AiMsg({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-[11px] font-bold text-accent">
        AI
      </span>
      <div className="min-w-0 flex-1 space-y-3 text-[15px] leading-relaxed text-ink">{children}</div>
    </div>
  );
}

export function UserMsg({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-surface px-4 py-2.5 text-[15px] leading-relaxed text-ink">{children}</div>
    </div>
  );
}

export function Chip({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-full border border-line bg-bg px-3.5 py-1.5 text-left text-[13px] text-ink hover:bg-surface disabled:opacity-40"
    >
      {children}
    </button>
  );
}

/** 아래에 고정되는 입력창. Enter로 보내기, Shift+Enter로 줄바꿈. */
export function Composer({
  value,
  onChange,
  onSubmit,
  disabled,
  placeholder,
  hint,
  minLength = 2,
  label = "질문",
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  placeholder: string;
  hint: string;
  minLength?: number;
  label?: string;
}) {
  const canSend = !disabled && value.trim().length >= minLength;
  return (
    <div className="sticky bottom-0 bg-gradient-to-t from-bg via-bg to-transparent pb-3 pt-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (canSend) onSubmit();
        }}
        className="flex items-end gap-2 rounded-2xl border border-line bg-bg p-2 shadow-sm focus-within:border-accent focus-within:ring-2 focus-within:ring-accent-soft"
      >
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              if (canSend) onSubmit();
            }
          }}
          disabled={disabled}
          rows={1}
          placeholder={placeholder}
          aria-label={label}
          className="max-h-40 min-h-[40px] flex-1 resize-none bg-transparent px-2 py-2 text-[15px] leading-relaxed text-ink outline-none placeholder:text-ink-soft/60 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={!canSend}
          aria-label="보내기"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-white transition hover:bg-accent-deep disabled:opacity-30"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M8 13V3M8 3L3.5 7.5M8 3l4.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </form>
      <p className="mt-1.5 px-2 text-[11px] text-ink-soft">{hint}</p>
    </div>
  );
}
