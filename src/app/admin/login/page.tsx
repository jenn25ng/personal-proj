import { AdminLoginForm } from "@/components/AdminLoginForm";
import { AuthShell } from "@/components/AuthShell";

export default function AdminLoginPage() {
  return (
    <AuthShell title="관리자" description="서버의 ADMIN_TOKEN 값을 입력해요. 12시간 동안 유지돼요.">
      <AdminLoginForm />
    </AuthShell>
  );
}
