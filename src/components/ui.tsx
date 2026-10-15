import type { Agreement, ModelAnswer } from "@/lib/types";

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-line bg-bg p-5 ${className}`}>{children}</section>;
}

export function StepTitle({ step, children }: { step: number; children: React.ReactNode }) {
  return (
    <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-ink">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-soft text-xs font-bold text-accent">{step}</span>
      {children}
    </h2>
  );
}

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

/** 버튼 클래스. 서버 컴포넌트의 <form> 버튼이나 <Link>에도 같은 모양을 쓸 수 있게 따로 뺐다. */
export function buttonClass(variant: Variant = "primary", size: Size = "md") {
  const base = "inline-flex items-center justify-center rounded-xl font-medium transition disabled:cursor-not-allowed disabled:opacity-40";
  const sz = size === "sm" ? "px-3 py-1.5 text-[13px]" : "px-4 py-2.5 text-sm";
  const styles =
    variant === "primary"
      ? "bg-accent text-white hover:bg-accent-deep"
      : variant === "secondary"
        ? "border border-line bg-bg text-ink hover:bg-surface"
        : variant === "danger"
          ? "text-ink-soft hover:bg-bad-soft hover:text-bad"
          : "text-ink-soft hover:bg-surface hover:text-ink";
  return `${base} ${sz} ${styles}`;
}

export function Button({
  children,
  onClick,
  disabled,
  variant = "primary",
  type = "button",
  size = "md",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: Variant;
  type?: "button" | "submit";
  size?: Size;
}) {
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={buttonClass(variant, size)}>
      {children}
    </button>
  );
}

/** 폼 입력칸 공용 클래스 (input, select) */
export const inputClass =
  "w-full rounded-xl border border-line bg-bg px-3 py-2.5 text-[15px] text-ink outline-none placeholder:text-ink-soft/60 focus:border-accent focus:ring-2 focus:ring-accent-soft disabled:bg-surface";

export function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-[13px] font-medium text-ink-soft">{label}</span>
      {children}
    </label>
  );
}

const NOTICE: Record<"info" | "ok" | "warn" | "bad", string> = {
  info: "bg-surface text-ink",
  ok: "bg-ok-soft text-ink",
  warn: "bg-warn-soft text-ink",
  bad: "bg-bad-soft text-ink",
};

/** 안내·성공·주의·오류 메시지 상자 */
export function Notice({ kind = "info", children }: { kind?: keyof typeof NOTICE; children: React.ReactNode }) {
  return <div className={`rounded-xl px-3.5 py-3 text-sm leading-relaxed ${NOTICE[kind]}`}>{children}</div>;
}

/** 서버 액션 결과(error/ok/devLink)를 한 번에 보여 준다. */
export function FormNotice({ state }: { state: { error?: string; ok?: string; devLink?: string } | undefined }) {
  if (!state || (!state.error && !state.ok && !state.devLink)) return null;
  return (
    <div className="space-y-2">
      {state.error && <Notice kind="bad">{state.error}</Notice>}
      {state.ok && <Notice kind="ok">{state.ok}</Notice>}
      {state.devLink && (
        <Notice>
          <span className="text-[12px] text-ink-soft">개발 모드: 메일 서버(SMTP_URL)가 없어 링크를 여기와 서버 콘솔에 보여 줘요.</span>{" "}
          <a href={state.devLink} className="break-all text-[12px] text-accent underline">
            {state.devLink}
          </a>
        </Notice>
      )}
    </div>
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
      <span className="mb-1 block text-[13px] font-medium text-ink-soft">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full rounded-xl border border-line bg-bg px-3 py-2.5 text-[15px] leading-relaxed text-ink outline-none placeholder:text-ink-soft/60 focus:border-accent focus:ring-2 focus:ring-accent-soft"
      />
    </label>
  );
}

const CONFIDENCE: Record<ModelAnswer["selfConfidence"], { label: string; cls: string }> = {
  high: { label: "꽤 확실해요", cls: "bg-ok-soft text-ok" },
  medium: { label: "조금 확실해요", cls: "bg-warn-soft text-warn" },
  low: { label: "확실하지 않아요", cls: "bg-bad-soft text-bad" },
};

export function ConfidenceBadge({ level }: { level: ModelAnswer["selfConfidence"] }) {
  const c = CONFIDENCE[level];
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${c.cls}`}>AI 스스로: {c.label}</span>;
}

const AGREEMENT: Record<Agreement, { label: string; cls: string; dot: string }> = {
  agree: { label: "AI들이 거의 같게 말했어요", cls: "bg-ok-soft text-ok", dot: "bg-ok" },
  partly: { label: "큰 줄기는 같은데 세부가 달라요", cls: "bg-warn-soft text-warn", dot: "bg-warn" },
  disagree: { label: "AI들이 서로 다르게 말했어요", cls: "bg-bad-soft text-bad", dot: "bg-bad" },
};

export function AgreementBanner({ agreement }: { agreement: Agreement }) {
  const a = AGREEMENT[agreement];
  return (
    <div className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium ${a.cls}`}>
      <span className={`h-2 w-2 rounded-full ${a.dot}`} />
      {a.label}
    </div>
  );
}

export function Spinner({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 text-[13px] text-ink-soft">
      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-line border-t-accent" />
      {text}
    </div>
  );
}
