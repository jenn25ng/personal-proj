import { SignupForm } from "@/components/AuthForms";
import { AuthShell } from "@/components/AuthShell";

export default function SignupPage() {
  return (
    <AuthShell
      title="부모 계정 만들기"
      description="계정은 부모님이 만들고, 아이는 부모님이 만든 프로필로 사용해요. 아이 프로필을 만들 때 법정대리인 동의를 받아요."
    >
      <SignupForm />
    </AuthShell>
  );
}
