/** 로그인·가입·비밀번호 화면의 공용 틀. 좁은 폭에 제목과 폼만 둔다. */
export function AuthShell({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-sm py-12">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
      {description && <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{description}</p>}
      <div className="mt-7">{children}</div>
    </div>
  );
}
