import { dbKind, getDb } from "@/db";
import { mailKind } from "@/lib/mail";
import { DEFAULT_MODELS, JUDGE_MODEL, MOCK_AI, configuredProviders } from "@/lib/providers";

/**
 * 배포 상태 확인. 비밀은 드러내지 않고, 무엇이 설정됐는지만 알려 준다.
 * 운영에서 고쳐야 할 것이 있으면 problems 에 적힌다.
 */
export async function GET() {
  const problems: string[] = [];
  let db: "ok" | "error" = "ok";
  try {
    const conn = await getDb();
    await conn.query.parents.findFirst({ columns: { id: true } });
  } catch (err) {
    db = "error";
    problems.push(`DB 연결 실패: ${err instanceof Error ? err.message : String(err)}`);
  }
  const providers = configuredProviders();
  const prod = process.env.NODE_ENV === "production";
  if (!MOCK_AI && providers.length === 0) problems.push("AI 제공사 키가 하나도 없어요.");
  if (MOCK_AI && prod) problems.push("운영에서 MOCK_AI=1 이 켜져 있어요.");
  if (mailKind() === "console" && prod) problems.push("SMTP_URL 이 없어 인증 메일이 발송되지 않아요. 부모가 아이 프로필을 만들 수 없어요.");
  if (dbKind() === "pglite" && prod) problems.push("운영에서 PGlite(파일 DB)를 쓰고 있어요. 재시작 시 데이터가 사라질 수 있어요.");
  if (!process.env.ADMIN_TOKEN) problems.push("ADMIN_TOKEN 이 없어 관리자 화면을 쓸 수 없어요.");
  if (!process.env.APP_URL && prod) problems.push("APP_URL 이 없어 메일 링크가 요청 host 로 만들어져요. 프록시 뒤라면 설정하세요.");

  return Response.json(
    {
      ok: db === "ok" && problems.length === 0,
      env: process.env.NODE_ENV,
      db: { kind: dbKind(), status: db },
      mail: mailKind(),
      ai: {
        mock: MOCK_AI,
        providers: { claude: providers.includes("claude"), gemini: providers.includes("gemini"), chatgpt: providers.includes("chatgpt") },
        models: { ...DEFAULT_MODELS, judge: JUDGE_MODEL },
        outputFilter: process.env.OUTPUT_FILTER === "off" ? "off" : "model",
      },
      admin: Boolean(process.env.ADMIN_TOKEN),
      problems,
    },
    { status: db === "ok" ? 200 : 503 },
  );
}
