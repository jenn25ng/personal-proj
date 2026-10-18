import { ForgotPasswordForm } from "@/components/AccountForms";
import { AuthShell } from "@/components/AuthShell";

export default function ForgotPasswordPage() {
  return (
    <AuthShell title="비밀번호 찾기" description="가입한 이메일로 비밀번호 재설정 링크를 보내 드려요.">
      <ForgotPasswordForm />
    </AuthShell>
  );
}
