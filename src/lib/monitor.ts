import { createHash } from "node:crypto";
import { and, eq, gte } from "drizzle-orm";
import { getDb, schema } from "@/db";

/**
 * 오류 모니터링. 외부 서비스 없이 동작한다.
 * 1) 콘솔에 남기고 2) error_events 에 저장하고 3) ALERT_WEBHOOK_URL 이 있으면 알림을 보낸다.
 * 같은 오류(fingerprint)는 ALERT_COOLDOWN_MIN(기본 10분) 안에 한 번만 알린다.
 * 이 함수는 절대 던지지 않는다. 모니터링이 서비스를 죽이면 안 된다.
 */

const WEBHOOK = process.env.ALERT_WEBHOOK_URL;
const COOLDOWN_MS = Math.max(1, Number(process.env.ALERT_COOLDOWN_MIN) || 10) * 60_000;
const APP_NAME = process.env.ALERT_APP_NAME ?? "생각 먼저 AI";

export type ErrorMeta = Record<string, unknown>;

function normalizeMessage(msg: string): string {
  // 숫자·id·토큰처럼 매번 달라지는 부분을 지워 같은 오류끼리 묶는다.
  return msg.replace(/[0-9a-f]{8}-[0-9a-f-]{27}/gi, "<uuid>").replace(/\d+/g, "#").slice(0, 200);
}

export function fingerprintOf(scope: string, message: string, stack?: string | null): string {
  const topFrame = (stack ?? "").split("\n").find((l) => l.trim().startsWith("at ")) ?? "";
  return createHash("sha256").update(`${scope}|${normalizeMessage(message)}|${topFrame.replace(/:\d+:\d+/g, "")}`).digest("hex").slice(0, 24);
}

async function sendWebhook(text: string): Promise<boolean> {
  if (!WEBHOOK) return false;
  try {
    // Slack(incoming webhook)은 {text}, Discord는 {content}, 그 외는 둘 다 넣어 보낸다.
    const body = WEBHOOK.includes("discord") ? { content: text } : { text, content: text };
    const res = await fetch(WEBHOOK, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    return res.ok;
  } catch (err) {
    console.error("[monitor] 웹훅 전송 실패", err);
    return false;
  }
}

export async function reportError(scope: string, error: unknown, meta: ErrorMeta = {}): Promise<void> {
  const err = error instanceof Error ? error : new Error(typeof error === "string" ? error : JSON.stringify(error));
  const message = (err.message || "알 수 없는 오류").slice(0, 1000);
  const stack = err.stack?.slice(0, 4000) ?? null;
  const fingerprint = fingerprintOf(scope, message, stack);
  console.error(`[${scope}] ${message}`, Object.keys(meta).length ? meta : "");

  try {
    const db = await getDb();
    const recent = await db.query.errorEvents.findFirst({
      where: and(eq(schema.errorEvents.fingerprint, fingerprint), eq(schema.errorEvents.alerted, true), gte(schema.errorEvents.createdAt, new Date(Date.now() - COOLDOWN_MS))),
      columns: { id: true },
    });
    let alerted = false;
    if (!recent && WEBHOOK) {
      const where = meta.route ? ` · ${String(meta.route)}` : "";
      alerted = await sendWebhook(`🚨 ${APP_NAME} 오류 [${scope}${where}]\n${message}\n(같은 오류는 ${COOLDOWN_MS / 60_000}분 동안 다시 알리지 않아요)`);
    }
    await db.insert(schema.errorEvents).values({ scope, fingerprint, message, stack, meta: Object.keys(meta).length ? meta : null, alerted });
  } catch (dbErr) {
    // DB 자체가 죽었을 수 있다. 콘솔에만 남긴다.
    console.error("[monitor] 오류 기록 실패", dbErr);
  }
}

export function alertConfigured(): boolean {
  return Boolean(WEBHOOK);
}
