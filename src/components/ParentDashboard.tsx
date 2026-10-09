"use client";

import { clearHistory, useHistory } from "@/lib/history";
import { Button, Card } from "./ui";

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl bg-white p-4 ring-1 ring-stone-200">
      <p className="text-xs text-stone-500">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-stone-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-stone-400">{hint}</p>}
    </div>
  );
}

const AGREEMENT_LABEL = { agree: "🟢 일치", partly: "🟡 부분 일치", disagree: "🔴 불일치" } as const;

export function ParentDashboard() {
  const { records, games, hydrated } = useHistory();

  if (!hydrated) return <p className="text-sm text-stone-500">불러오는 중...</p>;
  if (records.length === 0 && games.length === 0) {
    return (
      <Card>
        <p className="text-sm text-stone-600">아직 기록이 없어요. 아이가 질문이나 게임을 하나 마치면 여기에 나타나요.</p>
      </Card>
    );
  }

  const gameWrong = games.reduce((a, g) => a + g.wrongCount, 0);
  const gameFound = games.reduce((a, g) => a + g.found, 0);

  const n = records.length;
  const pct = (count: number) => (n === 0 ? "-" : `${Math.round((count / n) * 100)}%`);
  const predicted = records.filter((r) => r.prediction.trim().length > 0).length;
  const compared = records.filter((r) => r.comparedModels).length;
  const doubted = records.filter((r) => r.doubtedAi).length;
  const disagreed = records.filter((r) => r.agreement && r.agreement !== "agree").length;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="질문 수" value={String(n)} />
        <Stat label="먼저 예상한 비율" value={pct(predicted)} hint="묻기 전에 자기 생각을 적은 횟수" />
        <Stat label="다른 AI와 비교" value={pct(compared)} hint="비교 버튼을 눌러 본 횟수" />
        <Stat label="AI 답을 의심" value={pct(doubted)} hint="확인하고 싶은 부분이 있었다고 표시" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Stat label="틀린 거 찾기 게임" value={`${games.length}판`} />
        <Stat
          label="숨은 틀린 문장 찾은 비율"
          value={gameWrong === 0 ? "-" : `${Math.round((gameFound / gameWrong) * 100)}%`}
          hint={`${gameWrong}개 중 ${gameFound}개`}
        />
      </div>
      {n > 0 && (
      <p className="text-sm text-stone-600">
        AI들이 서로 다르게 답한 질문이 <span className="font-semibold">{disagreed}개</span> 있었어요. 아이와 함께 책이나
        믿을 수 있는 자료로 확인해 보면 좋은 대화 거리가 돼요.
      </p>
      )}

      {games.length > 0 && (
        <Card>
          <h2 className="mb-3 text-base font-bold text-stone-800">최근 게임</h2>
          <ul className="divide-y divide-stone-100">
            {games.slice(0, 10).map((g) => (
              <li key={g.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <span className="font-semibold text-stone-800">{g.topic}</span>
                <span className="text-stone-600">
                  {g.wrongCount}개 중 {g.found}개 찾음{g.falseAlarms > 0 && ` · 맞는 문장 ${g.falseAlarms}개 의심`}
                </span>
                <span className="text-xs text-stone-400">{new Date(g.createdAt).toLocaleDateString("ko-KR")}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {records.length > 0 && (
      <Card>
        <h2 className="mb-3 text-base font-bold text-stone-800">최근 질문</h2>
        <ul className="divide-y divide-stone-100">
          {records.map((r) => (
            <li key={r.id} className="py-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-stone-800">{r.question}</p>
                <span className="text-xs text-stone-400">{new Date(r.createdAt).toLocaleString("ko-KR")}</span>
              </div>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-stone-500">
                {r.topicLabel && <span>주제: {r.topicLabel}</span>}
                {r.agreement && <span>{AGREEMENT_LABEL[r.agreement]}</span>}
                {r.comparedModels && <span>비교함</span>}
                {r.doubtedAi && <span>의심함</span>}
                {r.usedHint && <span>힌트 사용</span>}
              </div>
              {r.prediction && <p className="mt-1 text-stone-700">예상: {r.prediction}</p>}
              {r.reflection && <p className="text-stone-700">정리: {r.reflection}</p>}
            </li>
          ))}
        </ul>
      </Card>
      )}

      <Button
        variant="secondary"
        onClick={() => {
          if (window.confirm("이 기기의 기록을 모두 지울까요?")) {
            clearHistory();
          }
        }}
      >
        기록 지우기
      </Button>
    </div>
  );
}
