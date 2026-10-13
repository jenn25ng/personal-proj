import { isAdminRequest } from "@/lib/admin";
import { exportAll } from "@/lib/backup";

export const maxDuration = 300;

/**
 * 전체 데이터 JSON 내보내기. 비밀번호 해시와 아이 기록이 들어 있으므로 반드시 안전한 곳에 암호화해 보관한다.
 * GET /api/admin/backup · Authorization: Bearer <ADMIN_TOKEN>
 */
export async function GET(request: Request) {
  if (!process.env.ADMIN_TOKEN) return Response.json({ error: "ADMIN_TOKEN이 설정되지 않았어요." }, { status: 503 });
  if (!(await isAdminRequest(request))) return Response.json({ error: "권한이 없어요." }, { status: 401 });
  const data = await exportAll();
  const stamp = data.exportedAt.replace(/[:.]/g, "-");
  return new Response(JSON.stringify(data), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="think-first-backup-${stamp}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
