import type { Agreement, ModelAnswer } from "@/lib/types";

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-200 ${className}`}>{children}</section>;
}

export function StepTitle({ step, children }: { step: number; children: React.ReactNode }) {
  return (
    <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-stone-800">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-400 text-sm text-white">{step}</span>
      {children}
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
  const base = "rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40";
  const styles =
    variant === "primary"
      ? "bg-amber-500 text-white hover:bg-amber-600"
      : "bg-stone-100 text-stone-700 hover:bg-stone-200";
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
      <span className="mb-1 block text-sm font-medium text-stone-600">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full rounded-xl border border-stone-300 p-3 text-base leading-relaxed outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
      />
    </label>
  );
}

const CONFIDENCE: Record<ModelAnswer["selfConfidence"], { label: string; cls: string }> = {
  high: { label: "꽤 확실해요", cls: "bg-emerald-100 text-emerald-800" },
  medium: { label: "조금 확실해요", cls: "bg-amber-100 text-amber-800" },
  low: { label: "확실하지 않아요", cls: "bg-rose-100 text-rose-800" },
};

export function ConfidenceBadge({ level }: { level: ModelAnswer["selfConfidence"] }) {
  const c = CONFIDENCE[level];
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${c.cls}`}>AI 스스로: {c.label}</span>;
}

const AGREEMENT: Record<Agreement, { label: string; cls: string; emoji: string }> = {
  agree: { label: "AI들이 거의 같게 말했어요", cls: "bg-emerald-50 ring-emerald-200 text-emerald-900", emoji: "🟢" },
  partly: { label: "큰 줄기는 같은데 세부가 달라요", cls: "bg-amber-50 ring-amber-200 text-amber-900", emoji: "🟡" },
  disagree: { label: "AI들이 서로 다르게 말했어요", cls: "bg-rose-50 ring-rose-200 text-rose-900", emoji: "🔴" },
};

export function AgreementBanner({ agreement }: { agreement: Agreement }) {
  const a = AGREEMENT[agreement];
  return (
    <div className={`rounded-xl p-3 text-sm font-semibold ring-1 ${a.cls}`}>
      {a.emoji} {a.label}
    </div>
  );
}

export function Spinner({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 text-sm text-stone-500">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-stone-300 border-t-amber-500" />
      {text}
    </div>
  );
}
