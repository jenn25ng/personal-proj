CREATE TABLE "daily_bonuses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"child_id" uuid NOT NULL,
	"day" text NOT NULL,
	"extra_questions" integer DEFAULT 0 NOT NULL,
	"extra_games" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "daily_bonuses" ADD CONSTRAINT "daily_bonuses_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "daily_bonuses_child_day_idx" ON "daily_bonuses" USING btree ("child_id","day");