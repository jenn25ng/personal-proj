import type { Instrumentation } from "next";

/**
 * Next.js 서버가 잡지 못한 오류(페이지 렌더, 라우트 핸들러, 서버 액션)를 모니터링으로 보낸다.
 * 이 파일은 Edge 런타임용으로도 컴파일되므로, DB를 쓰는 모듈은 Node 런타임에서만 불러온다.
 */
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { reportError } = await import("./lib/monitor");
  await reportError("server", err, {
    route: `${request.method} ${request.path}`,
    routerKind: context.routerKind,
    routeType: context.routeType,
    renderSource: context.renderSource,
  });
};
