import { checkQuota } from "@/lib/quota";
import { newContext } from "@/lib/usage";
import { makeGamePuzzle } from "@/lib/ai";
import { checkInput, checkOutput } from "@/lib/safety";
import { clean, errorResponse, requireChild } from "@/lib/api-utils";

export const maxDuration = 60;

export async function POST(request: Request) {
  const auth = await requireChild();
  if ("response" in auth) return auth.response;
  const limited = await checkQuota(auth.child, "game", true);
  if (limited) return limited;
  const body = await request.json().catch(() => ({}));
  const topic = clean(body.topic, 60);
  if (topic.length < 2) {
    return Response.json({ error: "주제를 조금 더 적어 주세요." }, { status: 400 });
  }
  const input = await checkInput([topic], { childId: auth.child.id, route: "game" });
  if (!input.ok) return Response.json({ error: input.message, code: "SAFETY" }, { status: 400 });
  try {
    const ctx = newContext(auth.child.id);
    const puzzle = await makeGamePuzzle(topic, ctx);
    const texts = [puzzle.intro, puzzle.lesson, puzzle.redirectMessage, ...puzzle.sentences.flatMap((s) => [s.text, s.correction, s.whyTricky])];
    if (!(await checkOutput(texts, { ...ctx, route: "game" }))) {
      return Response.json({ error: "이 주제로는 문제를 만들 수 없었어요. 다른 주제를 골라 봐요.", code: "SAFETY" }, { status: 422 });
    }
    return Response.json(puzzle);
  } catch (err) {
    return errorResponse(err);
  }
}
