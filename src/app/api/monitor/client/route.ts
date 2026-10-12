import { getParent } from "@/lib/auth";
import { reportError } from "@/lib/monitor";

/** 화면(error.tsx)에서 잡힌 오류. 로그인한 부모 세션이 있을 때만 받는다 (익명 스팸 방지). */
export async function POST(request: Request) {
  const parent = await getParent();
  if (!parent) return Response.json({ ok: false }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const message = typeof body.message === "string" ? body.message.slice(0, 500) : "클라이언트 오류";
  const err = new Error(message);
  err.stack = typeof body.stack === "string" ? body.stack.slice(0, 3000) : undefined;
  await reportError("client", err, { url: typeof body.url === "string" ? body.url.slice(0, 300) : undefined, digest: typeof body.digest === "string" ? body.digest : undefined });
  return Response.json({ ok: true });
}
