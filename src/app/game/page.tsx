import { FindMistakeGame } from "@/components/FindMistakeGame";

export default function GamePage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-stone-900">🕵️ 틀린 거 찾기</h1>
        <p className="mt-1 text-sm text-stone-600">
          AI는 가끔 틀린 말을 아주 자신 있게 해요. 그걸 알아채는 연습이에요.
        </p>
      </div>
      <FindMistakeGame />
    </div>
  );
}
