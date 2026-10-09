import { isAdminRequest } from "@/lib/admin";
import { buildUsageReport } from "@/lib/usage-report";

/**
 * 운영용 토큰 사용량·비용 집계 (pnpm usage 스크립트가 쓴다).
 * GET /api/admin/usage?days=30 · Authorization: Bearer <ADMIN_TOKEN>
 */
export async function GET(request: Request) {
  if (!process.env.ADMIN_TOKEN) return Response.json({ error: "ADMIN_TOKEN이 설정되지 않았어요." }, { status: 503 });
  if (!(await isAdminRequest(request))) return Response.json({ error: "권한이 없어요." }, { status: 401 });
  const url = new URL(request.url);
  const days = Math.min(365, Math.max(1, Number(url.searchParams.get("days") ?? 30) || 30));
  return Response.json(await buildUsageReport(days));
}
