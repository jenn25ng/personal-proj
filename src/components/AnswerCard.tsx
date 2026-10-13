import { PROVIDER_LABEL, type ModelAnswer } from "@/lib/types";
import { ConfidenceBadge } from "./ui";

const PROVIDER_STICKER: Record<ModelAnswer["provider"], string> = {
  claude: "bg-tangerine text-white",
  gemini: "bg-sky text-white",
  chatgpt: "bg-leaf text-white",
};

export function AnswerCard({ answer, highlight = false }: { answer: ModelAnswer; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl p-4 ${highlight ? "bg-sun-soft ring-1.5 ring-sun" : "bg-paper ring-1 ring-line"}`}>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className={`sticker px-2.5 py-0.5 text-sm ${PROVIDER_STICKER[answer.provider]}`}>{PROVIDER_LABEL[answer.provider]}</span>
        {answer.ok && <ConfidenceBadge level={answer.selfConfidence} />}
      </div>
      {answer.ok ? (
        <>
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-ink">{answer.text}</p>
          {answer.uncertainParts.length > 0 && (
            <div className="mt-3 rounded-xl bg-paper p-3 text-sm ring-1 ring-berry/30">
              <p className="mb-1 font-display text-berry">🔍 꼭 확인해 봐야 할 부분</p>
              <ul className="list-disc space-y-0.5 pl-5 text-ink">
                {answer.uncertainParts.map((u) => (
                  <li key={u}>{u}</li>
                ))}
              </ul>
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
