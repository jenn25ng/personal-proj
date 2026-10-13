import type { Agreement, ModelAnswer } from "@/lib/types";

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`paper p-5 ${className}`}>{children}</section>;
}

const STEP_COLORS = ["bg-tangerine", "bg-sky", "bg-leaf", "bg-berry"];

/** 번호 스티커가 붙은 단계 제목 */
export function StepTitle({ step, children }: { step: number; children: React.ReactNode }) {
  return (
    <h2 className="mb-3 flex items-center gap-2.5">
      <span className={`sticker h-8 w-8 text-base text-white ${STEP_COLORS[(step - 1) % STEP_COLORS.length]}`}>{step}</span>
      <span className="font-display text-xl text-ink">{children}</span>
    </h2>
  );
}

export function Button({
  children,
  onClick,
  disabled,
  variant = "primary",
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary";
  type?: "button" | "submit";
}) {
  const base = "rounded-2xl px-5 py-2.5 font-display text-base transition disabled:cursor-not-allowed disabled:opacity-40";
  const styles =
    variant === "primary"
      ? "btn-chunky bg-tangerine text-white hover:brightness-105"
      : "btn-chunky-soft bg-paper text-ink ring-1 ring-line hover:bg-sun-soft";
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${styles}`}>
      {children}
    </button>
  );
}

export function TextArea({
  value,
  onChange,
  placeholder,
  rows = 3,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  label: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-ink-soft">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="lined w-full rounded-xl border-1.5 border-line px-3 text-base text-ink outline-none placeholder:text-ink-soft/60 focus:border-tangerine focus:ring-2 focus:ring-sun"
      />
    </label>
  );
}

const CONFIDENCE: Record<ModelAnswer["selfConfidence"], { label: string; cls: string }> = {
  high: { label: "꽤 확실해요", cls: "bg-leaf-soft text-leaf" },
  medium: { label: "조금 확실해요", cls: "bg-sun-soft text-tangerine-deep" },
  low: { label: "확실하지 않아요", cls: "bg-berry-soft text-berry" },
};

export function ConfidenceBadge({ level }: { level: ModelAnswer["selfConfidence"] }) {
  const c = CONFIDENCE[level];
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${c.cls}`}>AI 스스로: {c.label}</span>;
}

const AGREEMENT: Record<Agreement, { label: string; cls: string; emoji: string }> = {
  agree: { label: "AI들이 거의 같게 말했어요", cls: "bg-leaf-soft ring-leaf/40 text-leaf", emoji: "🟢" },
  partly: { label: "큰 줄기는 같은데 세부가 달라요", cls: "bg-sun-soft ring-sun text-tangerine-deep", emoji: "🟡" },
  disagree: { label: "AI들이 서로 다르게 말했어요", cls: "bg-berry-soft ring-berry/40 text-berry", emoji: "🔴" },
};

export function AgreementBanner({ agreement }: { agreement: Agreement }) {
  const a = AGREEMENT[agreement];
  return (
    <div className={`rounded-xl p-3 font-display text-base ring-1 ${a.cls}`}>
      {a.emoji} {a.label}
    </div>
  );
}

export function Spinner({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 text-sm text-ink-soft">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-tangerine" />
      {text}
    </div>
  );
}
