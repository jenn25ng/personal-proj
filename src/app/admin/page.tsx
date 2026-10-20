import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Notice, buttonClass } from "@/components/ui";
import { adminConfigured, requireAdmin } from "@/lib/admin";
import { adminLogout } from "@/lib/admin-actions";
import { DAILY_GAME_LIMIT, DAILY_QUESTION_LIMIT, MAX_DAILY_GAME_LIMIT, MAX_DAILY_QUESTION_LIMIT } from "@/lib/quota";
import { TestErrorButton } from "@/components/TestErrorButton";
import { alertConfigured } from "@/lib/monitor";
import { buildErrorSummary, buildOverview, buildSafetySummary, buildUsageReport } from "@/lib/usage-report";

type Search = Promise<{ days?: string }>;
const PERIODS = [1, 7, 30, 90];

export default function AdminPage({ searchParams }: { searchParams: Search }) {
  return (
    <Suspense fallback={<p className="py-6 text-sm text-ink-soft">불러오는 중...</p>}>
      <AdminContent searchParams={searchParams} />
    </Suspense>
  );
}

const usd = (n: number | null | undefined, digits = 4) => (n == null ? "-" : `$${n.toFixed(digits)}`);
const krw = (n: number | null | undefined) => (n == null ? "" : ` (약 ${Math.round(n * 1400).toLocaleString()}원)`);
const num = (n: number) => n.toLocaleString();

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-bg p-4">
      <p className="text-[12px] text-ink-soft">{label}</p>
      <p className="mt-1 text-xl font-semibold tracking-tight text-ink">{value}</p>
      {hint && <p className="mt-1 text-[11px] leading-snug text-ink-soft">{hint}</p>}
    </div>
  );
}

async function AdminContent({ searchParams }: { searchParams: Search }) {
  // 환경변수 검사를 빌드 시점이 아니라 요청 시점에 하도록 한다.
  await connection();
  if (!adminConfigured()) {
    return (
      <div className="py-6">
        <Notice kind="warn">
          서버에 <code className="rounded bg-surface px-1 text-[12px]">ADMIN_TOKEN</code>이 설정되지 않았어요. <code className="rounded bg-surface px-1 text-[12px]">.env.local</code>에 길고 무작위한 값을 넣고 다시 시작하세요.
        </Notice>
      </div>
    );
  }
  await requireAdmin();
  const { days: daysParam } = await searchParams;
  const days = PERIODS.includes(Number(daysParam)) ? Number(daysParam) : 30;
  const [overview, report, safety, errors] = await Promise.all([buildOverview(), buildUsageReport(days), buildSafetySummary(days), buildErrorSummary(days)]);
  const th = "whitespace-nowrap px-3 py-2 text-left text-[12px] font-medium text-ink-soft";
  const td = "px-3 py-2 text-[13px] text-ink whitespace-nowrap";
  const tdr = `${td} text-right tabular-nums`;

  return (
    <div className="space-y-10 py-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">관리자</h1>
          <p className="mt-1 text-sm text-ink-soft">운영 현황과 AI 호출 비용. 이 화면은 운영자만 봐요.</p>
        </div>
        <form action={adminLogout}>
          <button type="submit" className={buttonClass("ghost", "sm")}>
            나가기
          </button>
        </form>
      </div>

      <section className="space-y-4">
        <h2 className="text-base font-semibold text-ink">현황 (전체 기간)</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Tile label="부모 계정" value={num(overview.parents)} hint={`이메일 인증 ${num(overview.verifiedParents)}명`} />
          <Tile label="아이 프로필" value={num(overview.children)} />
          <Tile label="질문" value={num(overview.questions)} hint={`그중 생각 단계 없이 답한 것 ${num(overview.directQuestions)}건`} />
          <Tile label="게임" value={`${num(overview.games)}판`} />
          <Tile
            label="하루 한도 기본값 (아이당)"
            value={`질문 ${DAILY_QUESTION_LIMIT} · 게임 ${DAILY_GAME_LIMIT}`}
            hint={`부모가 최대 질문 ${MAX_DAILY_QUESTION_LIMIT} · 게임 ${MAX_DAILY_GAME_LIMIT}까지 조정`}
          />
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-ink">AI 호출 비용</h2>
          <div className="flex gap-1">
            {PERIODS.map((p) => (
              <Link
                key={p}
                href={`/admin?days=${p}`}
                className={`rounded-full px-3 py-1 text-[12px] ${p === days ? "bg-ink text-white" : "border border-line text-ink-soft hover:bg-surface"}`}
              >
                {p}일
              </Link>
            ))}
          </div>
        </div>
        <p className="text-[12px] leading-relaxed text-ink-soft">
          {report.since.toLocaleDateString("ko-KR")} ~ {report.until.toLocaleDateString("ko-KR")} · 비용은{" "}
          <code className="rounded bg-surface px-1 text-[12px]">src/lib/pricing.ts</code>의 요금표로 추정한 값이에요. 환율 1,400원 가정.
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
          <Notice kind="warn">
            요금이 등록되지 않은 모델의 호출이 {num(report.totals.unpriced)}회 있어요. <code className="rounded bg-surface px-1 text-[12px]">src/lib/pricing.ts</code>에 추가하면 비용에 반영돼요.
          </Notice>
        )}

        <div className="overflow-x-auto rounded-2xl border border-line">
          <h3 className="border-b border-line px-3 py-2.5 text-[13px] font-semibold text-ink">용도 · 모델별</h3>
          {report.byPurposeModel.length === 0 ? (
            <p className="px-3 py-3 text-sm text-ink-soft">이 기간에 호출이 없어요.</p>
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
              <tbody className="divide-y divide-line">
                {report.byPurposeModel.map((a) => (
                  <tr key={`${a.purpose}|${a.provider}|${a.model}`}>
                    <td className={td}>{a.purpose}</td>
                    <td className={td}>{a.provider}</td>
                    <td className={td}>{a.model}</td>
                    <td className={tdr}>{num(a.calls)}</td>
                    <td className={tdr}>{a.errors ? <span className="text-bad">{num(a.errors)}</span> : "0"}</td>
                    <td className={tdr}>{num(a.inputTokens)}</td>
                    <td className={tdr}>{num(a.outputTokens)}</td>
                    <td className={tdr}>{num(a.reasoningTokens)}</td>
                    <td className={tdr}>{num(a.avgMs)}</td>
                    <td className={tdr}>{a.priced ? a.usd.toFixed(4) : <span className="text-warn">미등록</span>}</td>
                    <td className={tdr}>{a.priced ? a.usdPerCall.toFixed(5) : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="overflow-x-auto rounded-2xl border border-line">
          <h3 className="border-b border-line px-3 py-2.5 text-[13px] font-semibold text-ink">날짜별</h3>
          {report.byDay.length === 0 ? (
            <p className="px-3 py-3 text-sm text-ink-soft">이 기간에 호출이 없어요.</p>
          ) : (
            <table className="w-full max-w-md">
              <thead>
                <tr>
                  <th className={th}>날짜</th>
                  <th className={`${th} text-right`}>호출</th>
                  <th className={`${th} text-right`}>추정 $</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
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
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-base font-semibold text-ink">안전 필터 ({days}일)</h2>
        <div className="grid grid-cols-3 gap-3">
          <Tile label="걸린 횟수" value={num(safety.total)} />
          <Tile label="아이 입력" value={num(safety.byStage.input)} hint="AI에게 보내기 전에 막음" />
          <Tile label="AI 출력" value={num(safety.byStage.output)} hint="아이에게 보여 주기 전에 막음" />
        </div>
        {safety.byCategory.length > 0 && (
          <p className="text-[12px] leading-relaxed text-ink-soft">
            종류별: {safety.byCategory.map(([c, n]) => `${c} ${n}`).join(" · ")}
          </p>
        )}
        <div className="overflow-x-auto rounded-2xl border border-line">
          <h3 className="border-b border-line px-3 py-2.5 text-[13px] font-semibold text-ink">최근 사례</h3>
          {safety.recent.length === 0 ? (
            <p className="px-3 py-3 text-sm text-ink-soft">이 기간에 걸린 사례가 없어요.</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr>
                  <th className={th}>시각</th>
                  <th className={th}>단계</th>
                  <th className={th}>경로</th>
                  <th className={th}>검사기</th>
                  <th className={th}>종류</th>
                  <th className={th}>앞부분</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {safety.recent.map((e) => (
                  <tr key={e.id}>
                    <td className={td}>{e.createdAt.toLocaleString("ko-KR")}</td>
                    <td className={td}>{e.stage}</td>
                    <td className={td}>{e.route}</td>
                    <td className={td}>{e.detector}</td>
                    <td className={td}>{e.category}</td>
                    <td className="px-3 py-2 text-[12px] text-ink-soft">{e.excerpt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-ink">오류 ({days}일)</h2>
          <TestErrorButton />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Tile label="오류" value={num(errors.total)} hint={`${errors.grouped.length}종류`} />
          <Tile label="알림 보냄" value={num(errors.alerted)} hint={alertConfigured() ? "웹훅 설정됨" : "ALERT_WEBHOOK_URL 없음"} />
          <Tile label="범위별" value={errors.byScope.length ? errors.byScope.map(([s, n]) => `${s} ${n}`).join(" · ") : "-"} />
        </div>
        <div className="overflow-x-auto rounded-2xl border border-line">
          <h3 className="border-b border-line px-3 py-2.5 text-[13px] font-semibold text-ink">자주 난 오류</h3>
          {errors.grouped.length === 0 ? (
            <p className="px-3 py-3 text-sm text-ink-soft">이 기간에 오류가 없어요.</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr>
                  <th className={th}>범위</th>
                  <th className={th}>메시지</th>
                  <th className={`${th} text-right`}>횟수</th>
                  <th className={th}>마지막</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {errors.grouped.map((g, i) => (
                  <tr key={i}>
                    <td className={td}>{g.scope}</td>
                    <td className="px-3 py-2 text-[13px] text-ink">{g.message.slice(0, 160)}</td>
                    <td className={tdr}>{num(g.count)}</td>
                    <td className={td}>{g.last.toLocaleString("ko-KR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <p className="text-[12px] text-ink-soft">
        터미널에서도 볼 수 있어요: <code className="rounded bg-surface px-1 text-[12px]">pnpm usage 30</code> (APP_URL, ADMIN_TOKEN 필요)
      </p>
    </div>
  );
}
