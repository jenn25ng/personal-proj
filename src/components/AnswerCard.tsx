import { PROVIDER_LABEL, type ModelAnswer } from "@/lib/types";
import { ConfidenceBadge } from "./ui";

/** 대화 안의 AI 답 한 개. compact면 비교 목록용으로 작게. */
export function AnswerCard({ answer, compact = false }: { answer: ModelAnswer; compact?: boolean }) {
  return (
    <div className={compact ? "rounded-xl border border-line p-3" : ""}>
      <div className="mb-1.5 flex flex-wrap items-center gap-2">
        <span className="text-[13px] font-semibold text-ink">{PROVIDER_LABEL[answer.provider]}</span>
        {answer.ok && <ConfidenceBadge level={answer.selfConfidence} />}
      </div>
      {answer.ok ? (
        <>
          <p className={`whitespace-pre-wrap leading-relaxed text-ink ${compact ? "text-sm" : "text-[15px]"}`}>{answer.text}</p>
          {answer.uncertainParts.length > 0 && (
            <div className="mt-2 rounded-xl bg-warn-soft px-3 py-2 text-[13px] text-ink">
              <span className="font-medium text-warn">꼭 확인해 봐야 할 부분: </span>
              {answer.uncertainParts.join(" · ")}
            </div>
          )}
        </>
      ) : (
        <p className="text-sm text-ink-soft">
          {answer.error === "blocked"
            ? "이번 답은 보여 줄 수 없었어요. 다른 말로 다시 물어보거나, 부모님이나 선생님께 물어봐요."
            : "이 AI는 지금 답을 주지 못했어요. AI도 가끔 쉬어요."}
        </p>
      )}
    </div>
  );
}
