import { AdminLoginForm } from "@/components/AdminLoginForm";
import { Card } from "@/components/ui";

export default function AdminLoginPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-stone-900">관리자</h1>
        <p className="mt-1 text-sm text-stone-600">서버의 ADMIN_TOKEN 값을 입력해요. 12시간 동안 유지돼요.</p>
      </div>
      <Card>
        <AdminLoginForm />
      </Card>
    </div>
  );
}
