import { makeGamePuzzle } from "@/lib/ai";
import { clean, errorResponse, requireChild } from "@/lib/api-utils";

export const maxDuration = 60;

export async function POST(request: Request) {
  const auth = await requireChild();
  if ("response" in auth) return auth.response;
  const body = await request.json().catch(() => ({}));
  const topic = clean(body.topic, 60);
  if (topic.length < 2) {
    return Response.json({ error: "주제를 조금 더 적어 주세요." }, { status: 400 });
  }
  try {
    return Response.json(await makeGamePuzzle(topic));
  } catch (err) {
    return errorResponse(err);
  }
}
