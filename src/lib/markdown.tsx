import type { ReactNode } from "react";

/**
 * docs/ 의 마크다운 문서를 화면에 보여 주기 위한 아주 작은 렌더러.
 * 제목(#, ##, ###), 글머리 목록(-), 문단만 지원한다. 외부 의존성 없이 문서 한 벌로 관리하기 위해서다.
 */
export function renderMarkdown(src: string): ReactNode[] {
  const lines = src.split("\n");
  const out: ReactNode[] = [];
  let list: string[] = [];
  let para: string[] = [];
  let key = 0;

  const flushList = () => {
    if (list.length === 0) return;
    out.push(
      <ul key={key++} className="list-disc space-y-1 pl-5 text-[15px] leading-relaxed text-stone-800">
        {list.map((item, i) => (
          <li key={i}>{inline(item)}</li>
        ))}
      </ul>,
    );
    list = [];
  };
  const flushPara = () => {
    if (para.length === 0) return;
    out.push(
      <p key={key++} className="text-[15px] leading-relaxed text-stone-800">
        {inline(para.join(" "))}
      </p>,
    );
    para = [];
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.startsWith("### ")) {
      flushList(); flushPara();
      out.push(<h3 key={key++} className="mt-5 text-base font-bold text-stone-800">{line.slice(4)}</h3>);
    } else if (line.startsWith("## ")) {
      flushList(); flushPara();
      out.push(<h2 key={key++} className="mt-8 text-lg font-extrabold text-stone-900">{line.slice(3)}</h2>);
    } else if (line.startsWith("# ")) {
      flushList(); flushPara();
      out.push(<h1 key={key++} className="text-2xl font-extrabold text-stone-900">{line.slice(2)}</h1>);
    } else if (line.startsWith("- ")) {
      flushPara();
      list.push(line.slice(2));
    } else if (line.trim() === "") {
      flushList(); flushPara();
    } else {
      flushList();
      para.push(line.trim());
    }
  }
  flushList(); flushPara();
  return out;
}

/** 인라인 코드(`...`)와 [채울 곳] 표시만 처리한다. */
function inline(text: string): ReactNode[] {
  const parts = text.split(/(`[^`]+`|\[[^\]]+\])/g);
  return parts.map((p, i) => {
    if (p.startsWith("`") && p.endsWith("`")) {
      return <code key={i} className="rounded bg-stone-100 px-1 text-[13px]">{p.slice(1, -1)}</code>;
    }
    if (p.startsWith("[") && p.endsWith("]")) {
      return <mark key={i} className="rounded bg-amber-100 px-1 text-amber-900">{p}</mark>;
    }
    return p;
  });
}
