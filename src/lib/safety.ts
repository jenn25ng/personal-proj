import "server-only";
import { generateObject } from "ai";
import { z } from "zod";
import { getDb, schema } from "@/db";
import { MOCK_AI, getHelperModel } from "./providers";
import { AGE_GUIDE } from "./prompts";
import { screenInput, screenOutput, type SafetyCategory } from "./safety-rules";
import { tracked, type CallContext } from "./usage";

export { SAFETY_MESSAGE } from "./safety-rules";

/** 출력 모델 필터: "model"(기본) | "off". 규칙 필터는 항상 켜져 있다. */
const OUTPUT_FILTER = process.env.OUTPUT_FILTER === "off" ? "off" : "model";

type EventInput = {
  childId?: string;
  stage: "input" | "output";
  route: string;
  detector: "rules" | "model";
  category: string;
  excerpt: string;
};

export async function recordSafetyEvent(e: EventInput): Promise<void> {
  try {
    const db = await getDb();
    await db.insert(schema.safetyEvents).values({ ...e, childId: e.childId ?? null, excerpt: e.excerpt.slice(0, 80) });
  } catch (err) {
    console.error("[safety] 기록 실패", err);
  }
}

/**
 * 아이 입력 검사. 걸리면 아이에게 보여 줄 메시지를 돌려준다.
 * 자해 관련은 '차단'이 아니라 '돌봄 안내'이지만, 역시 AI에게 보내지는 않는다.
 */
export async function checkInput(
  texts: string[],
  ctx: { childId?: string; route: string },
): Promise<{ ok: true } | { ok: false; category: SafetyCategory; message: string }> {
  for (const t of texts) {
    if (!t) continue;
    const r = screenInput(t);
    if (!r.ok) {
      await recordSafetyEvent({ childId: ctx.childId, stage: "input", route: ctx.route, detector: "rules", category: r.category, excerpt: t });
      return r;
    }
  }
  return { ok: true };
}

const OUTPUT_SYSTEM = `당신은 어린이용 서비스의 출력 검사기예요. AI가 만든 글이 아래 기준에 맞는지만 판단해요.
${AGE_GUIDE}

다음 중 하나라도 있으면 safe=false:
- 성적인 내용, 노골적 폭력 묘사, 자해·자살 방법, 약물·무기 제작법
- 욕설, 특정 집단을 깎아내리는 표현
- 아이에게 개인정보를 묻거나 외부 사이트·앱으로 유도하는 내용
- 어른과 이야기하지 말라거나, 비밀로 하라는 내용
그 외에는 safe=true. 틀린 사실이나 어색한 문장은 여기서 보는 기준이 아니에요.
reason은 safe=false일 때만 한 문장으로.`;

const outputSchema = z.object({ safe: z.boolean(), reason: z.string() });

/**
 * AI 출력 검사. 규칙 필터 뒤에 모델 필터(Haiku, 라우트당 1회)를 돌린다.
 * 걸리면 false를 돌려주고, 호출한 쪽이 안전한 대체 응답을 만든다.
 */
export async function checkOutput(
  texts: string[],
  ctx: CallContext & { route: string },
  opts: { model?: boolean } = {},
): Promise<boolean> {
  const rules = screenOutput(texts);
  if (!rules.ok) {
    await recordSafetyEvent({ childId: ctx.childId, stage: "output", route: ctx.route, detector: "rules", category: rules.category, excerpt: texts.join(" ") });
    return false;
  }
  if (opts.model === false || OUTPUT_FILTER === "off" || MOCK_AI) return true;
  const helper = getHelperModel();
  if (!helper) return true;
  try {
    const { object } = await tracked({ ctx, purpose: "safety", provider: helper.provider, model: helper.id }, () =>
      generateObject({
        model: helper.model,
        schema: outputSchema,
        system: OUTPUT_SYSTEM,
        prompt: `검사할 글:\n"""\n${texts.filter(Boolean).join("\n---\n").slice(0, 6000)}\n"""`,
        providerOptions: { anthropic: { effort: "low" } },
      }),
    );
    if (!object.safe) {
      await recordSafetyEvent({ childId: ctx.childId, stage: "output", route: ctx.route, detector: "model", category: object.reason || "model", excerpt: texts.join(" ") });
    }
    return object.safe;
  } catch (err) {
    // 검사기가 실패하면 보여 주지 않는 쪽이 안전하다.
    console.error("[safety] 출력 검사 실패", err);
    return false;
  }
}

/** 출력이 막혔을 때 아이에게 보여 줄 말 */
export const BLOCKED_OUTPUT_MESSAGE = "이번 답은 보여 줄 수 없었어요. 다른 말로 다시 물어보거나, 부모님이나 선생님께 물어봐요.";
