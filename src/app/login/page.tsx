import { LoginForm } from "@/components/AuthForms";
import { Card } from "@/components/ui";

export default function LoginPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-stone-900">부모님 로그인</h1>
        <p className="mt-1 text-sm text-stone-600">아이가 쓰기 전에 부모님이 먼저 로그인하고 아이 프로필을 골라 주세요.</p>
      </div>
      <Card>
        <LoginForm />
      </Card>
    </div>
  );
}
