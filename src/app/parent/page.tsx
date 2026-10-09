import { ParentDashboard } from "@/components/ParentDashboard";

export default function ParentPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-stone-900">부모님 보기</h1>
        <p className="mt-1 text-sm text-stone-600">
          아이가 무엇을 물었는지보다, 묻기 전에 얼마나 생각했고 AI 답을 얼마나 의심했는지를 봐 주세요. 기록은 이 기기
          브라우저에만 저장돼요.
        </p>
      </div>
      <ParentDashboard />
    </div>
  );
}
