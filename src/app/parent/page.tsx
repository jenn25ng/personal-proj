import Link from "next/link";
import { Suspense } from "react";
import { ChildDashboard } from "@/components/ChildDashboard";
import { ResendVerificationForm } from "@/components/AccountForms";
import { AddChildForm, ConfirmSubmit } from "@/components/ChildForms";
import { BonusForm } from "@/components/BonusForm";
import { ChildLimitsForm } from "@/components/ChildLimitsForm";
import { Notice, buttonClass } from "@/components/ui";
import { deleteAccount, deleteChild, logout, selectChild } from "@/lib/actions";
import { listChildren, requireParent } from "@/lib/auth";
import { listGameResults, listQuestionLogs } from "@/lib/logs";
import { DAILY_GAME_LIMIT, DAILY_QUESTION_LIMIT, MAX_DAILY_GAME_LIMIT, MAX_DAILY_QUESTION_LIMIT, getQuota } from "@/lib/quota";

type Search = Promise<{ child?: string; pick?: string; verified?: string }>;

export default function ParentPage({ searchParams }: { searchParams: Search }) {
  return (
    <Suspense fallback={<p className="py-6 text-sm text-ink-soft">불러오는 중...</p>}>
      <ParentContent searchParams={searchParams} />
    </Suspense>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      {hint && <p className="mt-0.5 text-[12px] leading-relaxed text-ink-soft">{hint}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

async function ParentContent({ searchParams }: { searchParams: Search }) {
  const parent = await requireParent();
  const { child: childParam, pick, verified } = await searchParams;
  const kids = await listChildren(parent.id);
  const selected = kids.find((k) => k.id === childParam) ?? kids[0] ?? null;
  const [logs, games, quota] = selected
    ? await Promise.all([listQuestionLogs(selected.id), listGameResults(selected.id), getQuota(selected)])
    : [[], [], null];

  return (
    <div className="space-y-8 py-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">가족</h1>
          <p className="mt-1 text-sm text-ink-soft">{parent.name} 님, 안녕하세요.</p>
        </div>
        <form action={logout}>
          <button type="submit" className={buttonClass("ghost", "sm")}>
            로그아웃
          </button>
        </form>
      </div>

      {!parent.emailVerifiedAt && (
        <Notice kind="warn">
          <p>
            <span className="font-medium">{parent.email}</span>로 보낸 인증 메일의 링크를 열어 이메일 인증을 완료해 주세요. 인증이 끝나야
            아이 프로필을 만들 수 있어요.
          </p>
          <div className="mt-2">
            <ResendVerificationForm />
          </div>
        </Notice>
      )}

      {verified && <Notice kind="ok">이메일 인증이 끝났어요. 이제 아이 프로필을 만들 수 있어요.</Notice>}

      {pick && <Notice kind="warn">아이가 사용하려면 먼저 아래에서 아이 프로필을 고르고 “이 아이로 시작”을 눌러 주세요.</Notice>}

      <Section title="아이 프로필">
        {kids.length === 0 ? (
          parent.emailVerifiedAt && <p className="mb-4 text-sm text-ink-soft">아직 아이 프로필이 없어요. 아래에서 만들어 주세요.</p>
        ) : (
          <ul className="mb-5 space-y-2">
            {kids.map((k) => {
              const isSelected = selected?.id === k.id;
              return (
                <li
                  key={k.id}
                  className={`flex flex-wrap items-center justify-between gap-2 rounded-2xl border p-3 pl-4 ${
                    isSelected ? "border-accent bg-accent-soft/40" : "border-line"
                  }`}
                >
                  <div className="flex items-baseline gap-2">
                    <span className="text-[15px] font-medium text-ink">{k.nickname}</span>
                    <span className="text-[12px] text-ink-soft">{k.grade}학년</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {!isSelected && (
                      <Link href={`/parent?child=${k.id}`} className={buttonClass("ghost", "sm")}>
                        습관 보기
                      </Link>
                    )}
                    <form action={selectChild}>
                      <input type="hidden" name="childId" value={k.id} />
                      <button type="submit" className={buttonClass(isSelected ? "primary" : "secondary", "sm")}>
                        이 아이로 시작
                      </button>
                    </form>
                    <form action={deleteChild}>
                      <input type="hidden" name="childId" value={k.id} />
                      <ConfirmSubmit message={`${k.nickname}의 프로필과 모든 기록을 지울까요? 되돌릴 수 없어요.`}>지우기</ConfirmSubmit>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {parent.emailVerifiedAt ? (
          <details className="group rounded-2xl border border-line" open={kids.length === 0}>
            <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-ink marker:hidden [&::-webkit-details-marker]:hidden">
              <span className="mr-1.5 inline-block text-ink-soft transition group-open:rotate-90">›</span>
              아이 프로필 추가
            </summary>
            <div className="border-t border-line p-4">
              <AddChildForm />
            </div>
          </details>
        ) : (
          <p className="text-sm text-ink-soft">이메일 인증을 마치면 여기서 아이 프로필을 만들 수 있어요.</p>
        )}
      </Section>

      {selected && (
        <>
          <Section
            title={`${selected.nickname}의 습관`}
            hint="무엇을 물었는지가 아니라, 묻기 전에 얼마나 생각했고 AI 답을 얼마나 의심했는지를 봐요. 질문 내용은 아이만 볼 수 있어요. 아이가 마음 놓고 아무거나 물어볼 수 있어야 이 습관이 자라요."
          >
            <ChildDashboard child={selected} logs={logs} games={games} />
          </Section>

          <Section
            title={`${selected.nickname}의 하루 한도`}
            hint={
              quota
                ? `오늘 질문 ${quota.questionsUsed}/${quota.questionLimit} · 게임 ${quota.gamesUsed}/${quota.gameLimit} 썼어요.${
                    quota.bonusQuestions > 0 || quota.bonusGames > 0
                      ? ` 오늘만 추가: ${[quota.bonusQuestions > 0 ? `질문 +${quota.bonusQuestions}` : "", quota.bonusGames > 0 ? `게임 +${quota.bonusGames}` : ""].filter(Boolean).join(", ")}`
                      : ""
                  }`
                : undefined
            }
          >
            <div className="space-y-4">
              <div className="rounded-2xl bg-surface p-4">
                <p className="text-sm font-medium text-ink">오늘만 더 열어 주기</p>
                <p className="mb-3 mt-0.5 text-[12px] leading-relaxed text-ink-soft">
                  한도를 다 썼는데 꼭 더 하고 싶은 날, 오늘 하루만 더 열어 줘요. 자정이 지나면 원래 한도로 돌아가요.
                </p>
                <BonusForm childId={selected.id} />
              </div>
              <ChildLimitsForm
                childId={selected.id}
                questionLimit={selected.dailyQuestionLimit}
                gameLimit={selected.dailyGameLimit}
                defaults={{ question: DAILY_QUESTION_LIMIT, game: DAILY_GAME_LIMIT }}
                max={{ question: MAX_DAILY_QUESTION_LIMIT, game: MAX_DAILY_GAME_LIMIT }}
              />
            </div>
          </Section>
        </>
      )}

      <Section title="계정 지우기" hint="부모 계정과 모든 아이 프로필, 질문·게임 기록이 함께 지워져요.">
        <form action={deleteAccount}>
          <ConfirmSubmit message="정말 계정과 모든 기록을 지울까요? 되돌릴 수 없어요." variant="secondary">
            계정과 모든 기록 지우기
          </ConfirmSubmit>
        </form>
      </Section>
    </div>
  );
}
