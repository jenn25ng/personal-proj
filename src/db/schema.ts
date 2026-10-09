import { boolean, index, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type { AnswerResult, GamePuzzle } from "@/lib/types";

/** 부모 계정 */
export const parents = pgTable("parents", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** 이메일 인증·비밀번호 재설정용 일회성 토큰. 원본은 메일 링크에만 들어가고 DB에는 해시만 남긴다. */
export const emailTokens = pgTable(
  "email_tokens",
  {
    tokenHash: text("token_hash").primaryKey(),
    parentId: uuid("parent_id")
      .notNull()
      .references(() => parents.id, { onDelete: "cascade" }),
    purpose: text("purpose").$type<"verify" | "reset">().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("email_tokens_parent_idx").on(t.parentId, t.purpose)],
);

/** 로그인 세션. 토큰은 httpOnly 쿠키로만 전달된다. */
export const authSessions = pgTable(
  "auth_sessions",
  {
    token: text("token").primaryKey(),
    parentId: uuid("parent_id")
      .notNull()
      .references(() => parents.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("auth_sessions_parent_idx").on(t.parentId)],
);

/** 아동 프로필. 부모가 만들고, 만 14세 미만이므로 생성 시 법정대리인 동의를 기록한다. */
export const children = pgTable(
  "children",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    parentId: uuid("parent_id")
      .notNull()
      .references(() => parents.id, { onDelete: "cascade" }),
    nickname: text("nickname").notNull(),
    grade: integer("grade").notNull(),
    consentVersion: text("consent_version").notNull(),
    consentAt: timestamp("consent_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("children_parent_idx").on(t.parentId)],
);

/** 질문 한 번의 기록 */
export const questionLogs = pgTable(
  "question_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    childId: uuid("child_id")
      .notNull()
      .references(() => children.id, { onDelete: "cascade" }),
    question: text("question").notNull(),
    /** "think": 생각 먼저 단계를 거친 질문, "direct": 바로 답한 질문 */
    mode: text("mode").$type<"think" | "direct">().notNull().default("think"),
    topicLabel: text("topic_label").notNull().default(""),
    priorKnowledge: text("prior_knowledge").notNull().default(""),
    prediction: text("prediction").notNull().default(""),
    usedHint: boolean("used_hint").notNull().default(false),
    agreement: text("agreement"),
    comparedModels: boolean("compared_models").notNull().default(false),
    reflection: text("reflection").notNull().default(""),
    doubtedAi: boolean("doubted_ai").notNull().default(false),
    answers: jsonb("answers").$type<AnswerResult | null>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("question_logs_child_idx").on(t.childId, t.createdAt)],
);

/** 틀린 거 찾기 게임 결과 */
export const gameResults = pgTable(
  "game_results",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    childId: uuid("child_id")
      .notNull()
      .references(() => children.id, { onDelete: "cascade" }),
    topic: text("topic").notNull(),
    wrongCount: integer("wrong_count").notNull(),
    found: integer("found").notNull(),
    falseAlarms: integer("false_alarms").notNull(),
    puzzle: jsonb("puzzle").$type<GamePuzzle | null>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("game_results_child_idx").on(t.childId, t.createdAt)],
);

export type Parent = typeof parents.$inferSelect;
export type Child = typeof children.$inferSelect;
export type QuestionLog = typeof questionLogs.$inferSelect;
export type GameResult = typeof gameResults.$inferSelect;

/** AI 호출 한 번의 토큰 사용량. 비용을 실측하기 위한 운영용 기록이며 아이 화면에는 쓰지 않는다. */
export const aiUsage = pgTable(
  "ai_usage",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** 같은 HTTP 요청에서 나간 호출을 묶는 id (예: 답변 3개 + 판정) */
    requestId: text("request_id").notNull(),
    childId: uuid("child_id").references(() => children.id, { onDelete: "set null" }),
    purpose: text("purpose").$type<"think" | "answer" | "judge" | "reflect" | "game">().notNull(),
    provider: text("provider").notNull(),
    model: text("model").notNull(),
    inputTokens: integer("input_tokens").notNull().default(0),
    cacheReadTokens: integer("cache_read_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    reasoningTokens: integer("reasoning_tokens").notNull().default(0),
    durationMs: integer("duration_ms").notNull().default(0),
    ok: boolean("ok").notNull().default(true),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("ai_usage_created_idx").on(t.createdAt), index("ai_usage_request_idx").on(t.requestId)],
);

export type AiUsage = typeof aiUsage.$inferSelect;
