import { PROVIDER_LABEL, type ModelAnswer } from "@/lib/types";
import { ConfidenceBadge } from "./ui";

export function AnswerCard({ answer, highlight = false }: { answer: ModelAnswer; highlight?: boolean }) {
  return (
    <div className={`rounded-xl p-4 ring-1 ${highlight ? "bg-amber-50/60 ring-amber-200" : "bg-stone-50 ring-stone-200"}`}>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-sm font-bold text-stone-700">{PROVIDER_LABEL[answer.provider]}</span>
        {answer.ok && <ConfidenceBadge level={answer.selfConfidence} />}
      </div>
      {answer.ok ? (
        <>
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-stone-800">{answer.text}</p>
          {answer.uncertainParts.length > 0 && (
            <div className="mt-3 rounded-lg bg-white p-3 text-sm ring-1 ring-rose-100">
              <p className="mb-1 font-semibold text-rose-700">🔍 꼭 확인해 봐야 할 부분</p>
              <ul className="list-disc space-y-0.5 pl-5 text-stone-700">
                {answer.uncertainParts.map((u) => (
                  <li key={u}>{u}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      ) : (
        <p className="text-sm text-stone-500">
          {answer.error === "blocked"
            ? "이번 답은 보여 줄 수 없었어요. 다른 말로 다시 물어보거나, 부모님이나 선생님께 물어봐요."
            : "이 AI는 지금 답을 주지 못했어요. AI도 가끔 쉬어요."}
        </p>
      )}
    </div>
  );
}
