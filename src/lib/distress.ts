import "server-only";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { sendMail } from "./mail";
import { reportError } from "./monitor";
import { dayKey } from "./quota";

/**
 * 아이가 명시적인 힘든 신호(자해·자살·위험 표현, 규칙 필터가 잡는 것)를 보였을 때 부모에게 알린다.
 * - 대화 내용은 보내지 않는다. "힘든 마음을 표현했다"는 사실과 말을 거는 방법만.
 * - 하루 한 번만. 부모가 설정에서 끌 수 있다.
 * - 아이에게는 가입·첫 화면에서 이 사실을 미리 알린다. 몰래 하면 감시이고, 미리 말하면 약속이다.
 */
export async function notifyDistress(childId: string): Promise<void> {
  try {
    const db = await getDb();
    const child = await db.query.children.findFirst({ where: eq(schema.children.id, childId) });
    if (!child) return;
    const parent = await db.query.parents.findFirst({ where: eq(schema.parents.id, child.parentId) });
    if (!parent || !parent.alertOnDistress) return;
    const today = dayKey();
    if (parent.lastDistressAlertDay === today) return;
    await db.update(schema.parents).set({ lastDistressAlertDay: today }).where(eq(schema.parents.id, parent.id));
    const base = process.env.APP_URL ?? "";
    const link = `${base}/parent`;
    await sendMail(parent.email, `[생각 먼저 AI] ${child.nickname}이(가) 오늘 힘든 마음을 표현했어요`, distressText(parent.name, child.nickname, link), link);
  } catch (err) {
    await reportError("distress.notify", err, { childId });
  }
}

export function distressText(parentName: string, nickname: string, link: string) {
  return `${parentName} 님, 안녕하세요.

오늘 ${nickname}이(가) 생각 먼저 AI에서 힘든 마음을 나타내는 말을 적었어요. 아이에게는 믿을 수 있는 어른과 이야기하라는 안내와 청소년 상담전화 1388을 보여 줬어요.

무슨 말을 적었는지는 보여 드리지 않아요. 아이가 마음 놓고 말할 수 있어야 이런 신호도 보이기 때문이에요.

이렇게 말을 걸어 보세요.
- "요즘 좀 힘든 일 있어?"처럼 가볍게, 추궁하지 않고.
- 아이가 말하기 싫어하면 기다려 주세요. 오늘 꼭 다 듣지 않아도 괜찮아요.
- 걱정이 크면 청소년 상담전화 1388(24시간)에 부모님이 먼저 전화해도 돼요.

이 알림은 하루에 한 번만 보내요. 가족 화면(${link})에서 끌 수 있어요.`;
}
