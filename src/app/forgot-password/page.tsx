import { ForgotPasswordForm } from "@/components/AccountForms";
import { Card } from "@/components/ui";

export default function ForgotPasswordPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-stone-900">비밀번호 찾기</h1>
        <p className="mt-1 text-sm text-stone-600">가입한 이메일로 비밀번호 재설정 링크를 보내 드려요.</p>
      </div>
      <Card>
        <ForgotPasswordForm />
      </Card>
    </div>
  );
}
