import { QuestionFlow } from "@/components/QuestionFlow";

export default function Home() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-stone-900">궁금한 게 있어요?</h1>
        <p className="mt-1 text-sm text-stone-600">
          바로 답을 보기 전에 한 번 생각해 보고, AI 답은 꼭 확인해 봐요.
        </p>
      </div>
      <QuestionFlow />
    </div>
  );
}
