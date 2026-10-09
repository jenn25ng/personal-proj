import { readFileSync } from "node:fs";
import path from "node:path";
import { renderMarkdown } from "@/lib/markdown";

export const metadata = { title: "개인정보 처리방침 · 생각 먼저 AI" };

// 문서는 한 벌(docs/개인정보처리방침.md)만 두고, 모듈을 읽을 때 한 번만 불러와 정적으로 렌더링한다.
const SOURCE = readFileSync(path.join(process.cwd(), "docs", "개인정보처리방침.md"), "utf8");

export default function PrivacyPage() {
  return <article className="space-y-3 pb-8">{renderMarkdown(SOURCE)}</article>;
}
