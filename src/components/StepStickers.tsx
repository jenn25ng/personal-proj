/** 질문 흐름의 진행 표시. 끝낸 단계는 스티커가 붙고, 지금 단계는 커진다. */
export function StepStickers({ steps, current }: { steps: { label: string; emoji: string }[]; current: number }) {
  return (
    <ol className="flex items-center justify-between gap-1 px-1" aria-label="진행 단계">
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={s.label} className="flex flex-1 items-center gap-1">
            <div className="flex flex-col items-center gap-1">
              <span
                className={`sticker ${i % 2 ? "sticker-alt" : ""} h-10 w-10 text-lg transition ${
                  done ? "bg-leaf text-white" : active ? "scale-110 bg-sun text-ink ring-2 ring-tangerine" : "bg-paper text-ink-soft ring-1 ring-line"
                }`}
                aria-current={active ? "step" : undefined}
              >
                {done ? "✓" : s.emoji}
              </span>
              <span className={`text-[11px] ${active ? "font-semibold text-ink" : "text-ink-soft"}`}>{s.label}</span>
            </div>
            {i < steps.length - 1 && <span className={`mb-4 h-0.5 flex-1 rounded ${done ? "bg-leaf" : "bg-line"}`} />}
          </li>
        );
      })}
    </ol>
  );
}
