"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb, schema } from "@/db";
import {
  CONSENT_VERSION,
  createAuthSession,
  destroyAuthSession,
  getParent,
  hashPassword,
  setActiveChild,
  verifyPassword,
} from "./auth";

export type FormState = { error?: string } | undefined;

function field(form: FormData, name: string, max = 200): string {
  const v = form.get(name);
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function signup(_prev: FormState, form: FormData): Promise<FormState> {
  const email = field(form, "email").toLowerCase();
  const name = field(form, "name", 40);
  const password = field(form, "password", 200);
  if (!EMAIL_RE.test(email)) return { error: "이메일 형식을 확인해 주세요." };
  if (name.length < 1) return { error: "이름(또는 별명)을 적어 주세요." };
  if (password.length < 8) return { error: "비밀번호는 8자 이상이어야 해요." };

  const db = await getDb();
  const exists = await db.query.parents.findFirst({ where: eq(schema.parents.email, email) });
  if (exists) return { error: "이미 가입된 이메일이에요. 로그인해 주세요." };

  const [parent] = await db
    .insert(schema.parents)
    .values({ email, name, passwordHash: await hashPassword(password) })
    .returning({ id: schema.parents.id });
  await createAuthSession(parent.id);
  redirect("/parent");
}

export async function login(_prev: FormState, form: FormData): Promise<FormState> {
  const email = field(form, "email").toLowerCase();
  const password = field(form, "password", 200);
  const db = await getDb();
  const parent = await db.query.parents.findFirst({ where: eq(schema.parents.email, email) });
  if (!parent || !(await verifyPassword(password, parent.passwordHash))) {
    return { error: "이메일 또는 비밀번호가 맞지 않아요." };
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

  const nickname = field(form, "nickname", 20);
  const grade = Number(field(form, "grade", 2));
  const consent = form.get("consent") === "on";
  if (nickname.length < 1) return { error: "아이의 별명을 적어 주세요." };
  if (![4, 5, 6].includes(grade)) return { error: "학년을 골라 주세요." };
  if (!consent) return { error: "법정대리인 동의에 체크해야 프로필을 만들 수 있어요." };

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

/** 계정과 모든 아이 기록을 지운다 (cascade). */
export async function deleteAccount(): Promise<void> {
  const parent = await getParent();
  if (!parent) redirect("/login");
  const db = await getDb();
  await db.delete(schema.parents).where(eq(schema.parents.id, parent.id));
  await destroyAuthSession();
  redirect("/signup?deleted=1");
}
