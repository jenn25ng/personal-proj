"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb, schema } from "@/db";
import { resetPasswordText, sendMail, verifyEmailText } from "./mail";
import { MAX_DAILY_GAME_LIMIT, MAX_DAILY_QUESTION_LIMIT, grantTodayBonus } from "./quota";
import { appUrl, consumeToken, issueToken, issuedRecently, peekToken } from "./tokens";
import {
  CONSENT_VERSION,
  createAuthSession,
  destroyAuthSession,
  getParent,
  hashPassword,
  setActiveChild,
  verifyPassword,
} from "./auth";

/** values: 실패했을 때 폼이 비워지지 않도록 되돌려 주는 입력값 (비밀번호는 절대 넣지 않는다) */
export type FormState = { error?: string; ok?: string; devLink?: string; values?: Record<string, string> } | undefined;

function field(form: FormData, name: string, max = 200): string {
  const v = form.get(name);
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function signup(_prev: FormState, form: FormData): Promise<FormState> {
  const email = field(form, "email").toLowerCase();
  const name = field(form, "name", 40);
  const password = field(form, "password", 200);
  const values = { email, name };
  if (!EMAIL_RE.test(email)) return { error: "이메일 형식을 확인해 주세요.", values };
  if (name.length < 1) return { error: "이름(또는 별명)을 적어 주세요.", values };
  if (password.length < 8) return { error: "비밀번호는 8자 이상이어야 해요.", values };

  const db = await getDb();
  const exists = await db.query.parents.findFirst({ where: eq(schema.parents.email, email) });
  if (exists) return { error: "이미 가입된 이메일이에요. 로그인해 주세요.", values };

  const [parent] = await db
    .insert(schema.parents)
    .values({ email, name, passwordHash: await hashPassword(password) })
    .returning({ id: schema.parents.id });
  await sendVerificationMail(parent.id, email, name);
  await createAuthSession(parent.id);
  redirect("/parent");
}

export async function login(_prev: FormState, form: FormData): Promise<FormState> {
  const email = field(form, "email").toLowerCase();
  const password = field(form, "password", 200);
  const db = await getDb();
  const parent = await db.query.parents.findFirst({ where: eq(schema.parents.email, email) });
  if (!parent || !(await verifyPassword(password, parent.passwordHash))) {
    return { error: "이메일 또는 비밀번호가 맞지 않아요.", values: { email } };
  }
  await createAuthSession(parent.id);
  redirect("/parent");
}

export async function logout(): Promise<void> {
  await destroyAuthSession();
  redirect("/login");
}

export async function addChild(_prev: FormState, form: FormData): Promise<FormState> {
  const parent = await getParent();
  if (!parent) redirect("/login");
  if (!parent.emailVerifiedAt) return { error: "이메일 인증을 먼저 완료해야 아이 프로필을 만들 수 있어요." };

  const nickname = field(form, "nickname", 20);
  const grade = Number(field(form, "grade", 2));
  const consent = form.get("consent") === "on";
  const values = { nickname, grade: String(grade) };
  if (nickname.length < 1) return { error: "아이의 별명을 적어 주세요.", values };
  if (![4, 5, 6].includes(grade)) return { error: "학년을 골라 주세요.", values };
  if (!consent) return { error: "법정대리인 동의에 체크해야 프로필을 만들 수 있어요.", values };

  const db = await getDb();
  const count = (await db.query.children.findMany({ where: eq(schema.children.parentId, parent.id) })).length;
  if (count >= 5) return { error: "아이 프로필은 5명까지 만들 수 있어요." };

  const [child] = await db
    .insert(schema.children)
    .values({
      parentId: parent.id,
      nickname,
      grade,
      consentVersion: CONSENT_VERSION,
      consentAt: new Date(),
    })
    .returning({ id: schema.children.id });
  redirect(`/parent?child=${child.id}`);
}

export async function selectChild(form: FormData): Promise<void> {
  const parent = await getParent();
  if (!parent) redirect("/login");
  const childId = field(form, "childId", 36);
  const db = await getDb();
  const child = await db.query.children.findFirst({ where: eq(schema.children.id, childId) });
  if (!child || child.parentId !== parent.id) redirect("/parent");
  await setActiveChild(child.id);
  redirect("/");
}

export async function deleteChild(form: FormData): Promise<void> {
  const parent = await getParent();
  if (!parent) redirect("/login");
  const childId = field(form, "childId", 36);
  const db = await getDb();
  const child = await db.query.children.findFirst({ where: eq(schema.children.id, childId) });
  if (child && child.parentId === parent.id) {
    await db.delete(schema.children).where(eq(schema.children.id, child.id));
  }
  redirect("/parent");
}

/** 부모가 아이별 하루 한도를 정한다. 비우면 서버 기본값으로 돌아간다. */
export async function updateChildLimits(_prev: FormState, form: FormData): Promise<FormState> {
  const parent = await getParent();
  if (!parent) redirect("/login");
  const childId = field(form, "childId", 36);
  const db = await getDb();
  const child = await db.query.children.findFirst({ where: eq(schema.children.id, childId) });
  if (!child || child.parentId !== parent.id) redirect("/parent");

  const parse = (name: string, max: number): number | null | "bad" => {
    const raw = field(form, name, 4);
    if (raw === "") return null;
    const n = Number(raw);
    return Number.isInteger(n) && n >= 1 && n <= max ? n : "bad";
  };
  const q = parse("dailyQuestionLimit", MAX_DAILY_QUESTION_LIMIT);
  const g = parse("dailyGameLimit", MAX_DAILY_GAME_LIMIT);
  if (q === "bad") return { error: `하루 질문 수는 1~${MAX_DAILY_QUESTION_LIMIT} 사이로 정해 주세요.` };
  if (g === "bad") return { error: `하루 게임 수는 1~${MAX_DAILY_GAME_LIMIT} 사이로 정해 주세요.` };

  await db.update(schema.children).set({ dailyQuestionLimit: q, dailyGameLimit: g }).where(eq(schema.children.id, child.id));
  return { ok: `${child.nickname}의 하루 한도를 저장했어요.` };
}

/** 한도를 넘은 날, 부모가 오늘만 추가로 열어 준다. */
export async function grantBonus(_prev: FormState, form: FormData): Promise<FormState> {
  const parent = await getParent();
  if (!parent) redirect("/login");
  const childId = field(form, "childId", 36);
  const db = await getDb();
  const child = await db.query.children.findFirst({ where: eq(schema.children.id, childId) });
  if (!child || child.parentId !== parent.id) redirect("/parent");

  const questions = Math.min(10, Math.max(0, Number(field(form, "questions", 3)) || 0));
  const games = Math.min(5, Math.max(0, Number(field(form, "games", 3)) || 0));
  if (questions === 0 && games === 0) return { error: "몇 개를 더 열어 줄지 골라 주세요." };

  const r = await grantTodayBonus(child, { questions, games });
  if (!r.ok) return { error: r.error };
  const parts = [questions > 0 ? `질문 +${questions}` : "", games > 0 ? `게임 +${games}` : ""].filter(Boolean).join(", ");
  return { ok: `오늘만 ${parts} 열어 줬어요. (오늘 한도: 질문 ${r.questionLimit}, 게임 ${r.gameLimit})` };
}

/** 계정과 모든 아이 기록을 지운다 (cascade). */
export async function deleteAccount(): Promise<void> {
  const parent = await getParent();
  if (!parent) redirect("/login");
  const db = await getDb();
  await db.delete(schema.parents).where(eq(schema.parents.id, parent.id));
  await destroyAuthSession();
  redirect("/signup?deleted=1");
}

// ---------- 이메일 인증 ----------

async function sendVerificationMail(parentId: string, email: string, name: string) {
  const token = await issueToken(parentId, "verify");
  const link = await appUrl(`/verify-email?token=${token}`);
  return sendMail(email, "[생각 먼저 AI] 이메일 인증을 완료해 주세요", verifyEmailText(name, link), link);
}

/** /parent 배너의 "인증 메일 다시 보내기" */
export async function resendVerification(): Promise<FormState> {
  const parent = await getParent();
  if (!parent) redirect("/login");
  if (parent.emailVerifiedAt) return { ok: "이미 인증된 이메일이에요." };
  if (await issuedRecently(parent.id, "verify")) return { error: "방금 보냈어요. 1분 뒤에 다시 시도해 주세요." };
  const result = await sendVerificationMail(parent.id, parent.email, parent.name);
  return devAware({ ok: `${parent.email}로 인증 메일을 보냈어요.` }, result);
}

/** /verify-email 페이지의 "인증 완료" 버튼 */
export async function verifyEmail(_prev: FormState, form: FormData): Promise<FormState> {
  const token = field(form, "token", 200);
  const parentId = await consumeToken(token, "verify");
  if (!parentId) return { error: "링크가 만료됐거나 이미 사용됐어요. 부모님 화면에서 인증 메일을 다시 받아 주세요." };
  const db = await getDb();
  await db.update(schema.parents).set({ emailVerifiedAt: new Date() }).where(eq(schema.parents.id, parentId));
  redirect("/parent?verified=1");
}

// ---------- 비밀번호 재설정 ----------

/** /forgot-password. 가입 여부를 드러내지 않기 위해 항상 같은 안내를 보여 준다. */
export async function requestPasswordReset(_prev: FormState, form: FormData): Promise<FormState> {
  const email = field(form, "email").toLowerCase();
  if (!EMAIL_RE.test(email)) return { error: "이메일 형식을 확인해 주세요.", values: { email } };
  const ok = { ok: "가입된 이메일이라면 재설정 링크를 보냈어요. 메일함(스팸함 포함)을 확인해 주세요." };

  const db = await getDb();
  const parent = await db.query.parents.findFirst({ where: eq(schema.parents.email, email) });
  if (!parent || (await issuedRecently(parent.id, "reset"))) return ok;

  const token = await issueToken(parent.id, "reset");
  const link = await appUrl(`/reset-password?token=${token}`);
  const result = await sendMail(email, "[생각 먼저 AI] 비밀번호 재설정", resetPasswordText(parent.name, link), link);
  return devAware(ok, result);
}

/** /reset-password?token=... 의 새 비밀번호 폼 */
export async function resetPassword(_prev: FormState, form: FormData): Promise<FormState> {
  const token = field(form, "token", 200);
  const password = field(form, "password", 200);
  const confirm = field(form, "confirm", 200);
  if (password.length < 8) return { error: "비밀번호는 8자 이상이어야 해요." };
  if (password !== confirm) return { error: "두 비밀번호가 서로 달라요." };
  if (!(await peekToken(token, "reset"))) return { error: "링크가 만료됐거나 이미 사용됐어요. 재설정을 다시 요청해 주세요." };

  const parentId = await consumeToken(token, "reset");
  if (!parentId) return { error: "링크가 만료됐거나 이미 사용됐어요. 재설정을 다시 요청해 주세요." };

  const db = await getDb();
  await db.update(schema.parents).set({ passwordHash: await hashPassword(password) }).where(eq(schema.parents.id, parentId));
  // 다른 기기에 남아 있는 로그인도 모두 끊는다.
  await db.delete(schema.authSessions).where(eq(schema.authSessions.parentId, parentId));
  await destroyAuthSession();
  redirect("/login?reset=1");
}

/** SMTP가 없는 개발 환경에서는 링크를 화면에도 보여 준다. 운영에서는 절대 노출하지 않는다. */
function devAware(state: { ok: string }, result: Awaited<ReturnType<typeof sendMail>>): FormState {
  if (result.delivered === "console" && process.env.NODE_ENV !== "production") {
    return { ...state, devLink: result.link };
  }
  return state;
}
