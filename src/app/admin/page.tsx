import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Card } from "@/components/ui";
import { adminConfigured, requireAdmin } from "@/lib/admin";
import { adminLogout } from "@/lib/admin-actions";
import { buildOverview, buildUsageReport } from "@/lib/usage-report";

type Search = Promise<{ days?: string }>;
const PERIODS = [1, 7, 30, 90];

export default function AdminPage({ searchParams }: { searchParams: Search }) {
  return (
    <Suspense fallback={<p className="text-sm text-stone-500">불러오는 중...</p>}>
      <AdminContent searchParams={searchParams} />
    </Suspense>
  );
}

const usd = (n: number | null | undefined, digits = 4) => (n == null ? "-" : `$${n.toFixed(digits)}`);
const krw = (n: number | null | undefined) => (n == null ? "" : ` (약 ${Math.round(n * 1400).toLocaleString()}원)`);
const num = (n: number) => n.toLocaleString();

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl bg-white p-4 ring-1 ring-stone-200">
      <p className="text-xs text-stone-500">{label}</p>
      <p className="mt-1 text-xl font-extrabold text-stone-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-stone-400">{hint}</p>}
    </div>
  );
}

async function AdminContent({ searchParams }: { searchParams: Search }) {
  // 환경변수 검사를 빌드 시점이 아니라 요청 시점에 하도록 한다.
  await connection();
  if (!adminConfigured()) {
    return (
      <Card>
        <p className="text-sm text-stone-700">
          서버에 <code>ADMIN_TOKEN</code>이 설정되지 않았어요. <code>.env.local</code>에 길고 무작위한 값을 넣고 다시 시작하세요.
        </p>
      </Card>
    );
  }
  await requireAdmin();
  const { days: daysParam } = await searchParams;
  const days = PERIODS.includes(Number(daysParam)) ? Number(daysParam) : 30;
  const [overview, report] = await Promise.all([buildOverview(), buildUsageReport(days)]);
  const th = "px-2 py-1.5 text-left text-xs font-semibold text-stone-500";
  const td = "px-2 py-1.5 text-sm text-stone-800 whitespace-nowrap";
  const tdr = `${td} text-right tabular-nums`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-extrabold text-stone-900">관리자</h1>
          <p className="mt-1 text-sm text-stone-600">운영 현황과 AI 호출 비용. 이 화면은 운영자만 봐요.</p>
        </div>
        <form action={adminLogout}>
          <button type="submit" className="rounded-xl bg-stone-100 px-3 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-200">
            나가기
          </button>
        </form>
      </div>

      <section className="space-y-3">
        <h2 className="text-base font-bold text-stone-800">현황 (전체 기간)</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Tile label="부모 계정" value={num(overview.parents)} hint={`이메일 인증 ${num(overview.verifiedParents)}명`} />
          <Tile label="아이 프로필" value={num(overview.children)} />
          <Tile label="질문" value={num(overview.questions)} hint={`그중 바로 답한 질문 ${num(overview.directQuestions)}건`} />
          <Tile label="게임" value={`${num(overview.games)}판`} />
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-bold text-stone-800">AI 호출 비용</h2>
          <div className="flex gap-1">
            {PERIODS.map((p) => (
              <Link
                key={p}
                href={`/admin?days=${p}`}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${p === days ? "bg-amber-500 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"}`}
              >
                {p}일
              </Link>
            ))}
          </div>
        </div>
        <p className="text-xs text-stone-500">
          {report.since.toLocaleDateString("ko-KR")} ~ {report.until.toLocaleDateString("ko-KR")} · 비용은{" "}
          <code>src/lib/pricing.ts</code>의 요금표로 추정한 값이에요. 환율 1,400원 가정.
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Tile label="추정 비용" value={usd(report.totals.usd, 2)} hint={krw(report.totals.usd).trim() || undefined} />
          <Tile label="호출" value={`${num(report.totals.calls)}회`} hint={report.totals.errors ? `오류 ${num(report.totals.errors)}회` : "오류 없음"} />
          <Tile label="질문 1건당" value={usd(report.perQuestion.usd)} hint={`${num(report.perQuestion.questions)}건${krw(report.perQuestion.usd)}`} />
          <Tile label="게임 1판당" value={usd(report.perGame.usd)} hint={`${num(report.perGame.games)}판${krw(report.perGame.usd)}`} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Tile label="입력 토큰" value={num(report.totals.inputTokens)} hint={report.totals.cacheReadTokens ? `캐시 읽기 ${num(report.totals.cacheReadTokens)}` : undefined} />
          <Tile label="출력 토큰" value={num(report.totals.outputTokens)} />
          <Tile label="사고 토큰" value={num(report.totals.reasoningTokens)} hint="출력에 포함" />
        </div>
        {report.totals.unpriced > 0 && (
          <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900 ring-1 ring-amber-200">
            요금이 등록되지 않은 모델의 호출이 {num(report.totals.unpriced)}회 있어요. <code>src/lib/pricing.ts</code>에 추가하면 비용에 반영돼요.
          </p>
        )}

        <Card className="overflow-x-auto p-3">
          <h3 className="mb-2 px-2 text-sm font-bold text-stone-700">용도 · 모델별</h3>
          {report.byPurposeModel.length === 0 ? (
            <p className="px-2 text-sm text-stone-500">이 기간에 호출이 없어요.</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr>
                  <th className={th}>용도</th>
                  <th className={th}>제공사</th>
                  <th className={th}>모델</th>
                  <th className={`${th} text-right`}>호출</th>
                  <th className={`${th} text-right`}>오류</th>
                  <th className={`${th} text-right`}>입력</th>
                  <th className={`${th} text-right`}>출력</th>
                  <th className={`${th} text-right`}>사고</th>
                  <th className={`${th} text-right`}>평균 ms</th>
                  <th className={`${th} text-right`}>추정 $</th>
                  <th className={`${th} text-right`}>호출당 $</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {report.byPurposeModel.map((a) => (
                  <tr key={`${a.purpose}|${a.provider}|${a.model}`}>
                    <td className={td}>{a.purpose}</td>
                    <td className={td}>{a.provider}</td>
                    <td className={td}>{a.model}</td>
                    <td className={tdr}>{num(a.calls)}</td>
                    <td className={tdr}>{a.errors ? <span className="text-rose-700">{num(a.errors)}</span> : "0"}</td>
                    <td className={tdr}>{num(a.inputTokens)}</td>
                    <td className={tdr}>{num(a.outputTokens)}</td>
                    <td className={tdr}>{num(a.reasoningTokens)}</td>
                    <td className={tdr}>{num(a.avgMs)}</td>
                    <td className={tdr}>{a.priced ? a.usd.toFixed(4) : <span className="text-amber-700">미등록</span>}</td>
                    <td className={tdr}>{a.priced ? a.usdPerCall.toFixed(5) : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card className="overflow-x-auto p-3">
          <h3 className="mb-2 px-2 text-sm font-bold text-stone-700">날짜별</h3>
          {report.byDay.length === 0 ? (
            <p className="px-2 text-sm text-stone-500">이 기간에 호출이 없어요.</p>
          ) : (
            <table className="w-full max-w-md">
              <thead>
                <tr>
                  <th className={th}>날짜</th>
                  <th className={`${th} text-right`}>호출</th>
                  <th className={`${th} text-right`}>추정 $</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {report.byDay.map((d) => (
                  <tr key={d.day}>
                    <td className={td}>{d.day}</td>
                    <td className={tdr}>{num(d.calls)}</td>
                    <td className={tdr}>{d.usd.toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </section>

      <p className="text-xs text-stone-400">
        터미널에서도 볼 수 있어요: <code>pnpm usage 30</code> (APP_URL, ADMIN_TOKEN 필요)
      </p>
    </div>
  );
}
