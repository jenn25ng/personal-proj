import Link from "next/link";
import { Suspense } from "react";
import { ChildDashboard } from "@/components/ChildDashboard";
import { ResendVerificationForm } from "@/components/AccountForms";
import { AddChildForm, ConfirmSubmit } from "@/components/ChildForms";
import { Card } from "@/components/ui";
import { deleteAccount, deleteChild, logout, selectChild } from "@/lib/actions";
import { listChildren, requireParent } from "@/lib/auth";
import { listGameResults, listQuestionLogs } from "@/lib/logs";

type Search = Promise<{ child?: string; pick?: string; verified?: string }>;

export default function ParentPage({ searchParams }: { searchParams: Search }) {
  return (
    <Suspense fallback={<p className="text-sm text-stone-500">불러오는 중...</p>}>
      <ParentContent searchParams={searchParams} />
    </Suspense>
  );
}

async function ParentContent({ searchParams }: { searchParams: Search }) {
  const parent = await requireParent();
  const { child: childParam, pick, verified } = await searchParams;
  const kids = await listChildren(parent.id);
  const selected = kids.find((k) => k.id === childParam) ?? kids[0] ?? null;
  const [logs, games] = selected
    ? await Promise.all([listQuestionLogs(selected.id), listGameResults(selected.id)])
    : [[], []];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-extrabold text-stone-900">부모님 보기</h1>
          <p className="mt-1 text-sm text-stone-600">{parent.name} 님, 안녕하세요.</p>
        </div>
        <form action={logout}>
          <button type="submit" className="rounded-xl bg-stone-100 px-3 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-200">
            로그아웃
          </button>
        </form>
      </div>

      {!parent.emailVerifiedAt && (
        <div className="space-y-2 rounded-xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
          <p>
            <span className="font-semibold">{parent.email}</span>로 보낸 인증 메일의 링크를 열어 이메일 인증을 완료해 주세요.
            인증이 끝나야 아이 프로필을 만들 수 있어요.
          </p>
          <ResendVerificationForm />
        </div>
      )}

      {verified && (
        <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800 ring-1 ring-emerald-200">
          이메일 인증이 끝났어요. 이제 아이 프로필을 만들 수 있어요.
        </p>
      )}

      {pick && (
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">
          아이가 사용하려면 먼저 아래에서 아이 프로필을 고르고 “이 아이로 시작”을 눌러 주세요.
        </p>
      )}

      <Card>
        <h2 className="mb-3 text-base font-bold text-stone-800">아이 프로필</h2>
        {kids.length === 0 ? (
          <p className="mb-4 text-sm text-stone-600">아직 아이 프로필이 없어요. 아래에서 만들어 주세요.</p>
        ) : (
          <ul className="mb-4 space-y-2">
            {kids.map((k) => (
              <li
                key={k.id}
                className={`flex flex-wrap items-center justify-between gap-2 rounded-xl p-3 ring-1 ${
                  selected?.id === k.id ? "bg-amber-50 ring-amber-300" : "bg-stone-50 ring-stone-200"
                }`}
              >
                <div>
                  <span className="font-semibold text-stone-800">{k.nickname}</span>
                  <span className="ml-2 text-xs text-stone-500">{k.grade}학년</span>
                </div>
                <div className="flex items-center gap-2">
                  {selected?.id !== k.id && (
                    <Link href={`/parent?child=${k.id}`} className="rounded-xl bg-stone-100 px-3 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-200">
                      기록 보기
                    </Link>
                  )}
                  <form action={selectChild}>
                    <input type="hidden" name="childId" value={k.id} />
                    <button type="submit" className="rounded-xl bg-amber-500 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-600">
                      이 아이로 시작
                    </button>
                  </form>
                  <form action={deleteChild}>
                    <input type="hidden" name="childId" value={k.id} />
                    <ConfirmSubmit message={`${k.nickname}의 프로필과 모든 기록을 지울까요? 되돌릴 수 없어요.`}>지우기</ConfirmSubmit>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
        {parent.emailVerifiedAt ? (
          <AddChildForm />
        ) : (
          <p className="text-sm text-stone-500">이메일 인증을 마치면 여기서 아이 프로필을 만들 수 있어요.</p>
        )}
      </Card>

      {selected && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-stone-800">{selected.nickname}의 기록</h2>
          <p className="text-sm text-stone-600">
            무엇을 물었는지보다, 묻기 전에 얼마나 생각했고 AI 답을 얼마나 의심했는지를 봐 주세요.
          </p>
          <ChildDashboard child={selected} logs={logs} games={games} />
        </div>
      )}

      <Card className="ring-rose-100">
        <h2 className="mb-1 text-sm font-bold text-stone-700">계정 지우기</h2>
        <p className="mb-3 text-xs text-stone-500">부모 계정과 모든 아이 프로필, 질문·게임 기록이 함께 지워져요.</p>
        <form action={deleteAccount}>
          <ConfirmSubmit message="정말 계정과 모든 기록을 지울까요? 되돌릴 수 없어요.">계정과 모든 기록 지우기</ConfirmSubmit>
        </form>
      </Card>
    </div>
  );
}
