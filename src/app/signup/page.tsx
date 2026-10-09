import { SignupForm } from "@/components/AuthForms";
import { Card } from "@/components/ui";

export default function SignupPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-stone-900">부모 계정 만들기</h1>
        <p className="mt-1 text-sm text-stone-600">
          계정은 부모님이 만들고, 아이는 부모님이 만든 프로필로 사용해요. 아이 프로필을 만들 때 법정대리인 동의를 받아요.
        </p>
      </div>
      <Card>
        <SignupForm />
      </Card>
    </div>
  );
}
