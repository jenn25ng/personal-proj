CREATE TABLE "threads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"child_id" uuid NOT NULL,
	"topic_label" text DEFAULT '' NOT NULL,
	"memory" text DEFAULT '' NOT NULL,
	"turn_count" integer DEFAULT 0 NOT NULL,
	"think_count" integer DEFAULT 0 NOT NULL,
	"think_engaged" boolean DEFAULT false NOT NULL,
	"think_off" boolean DEFAULT false NOT NULL,
	"first_direct_done" boolean DEFAULT false NOT NULL,
	"adult_suggested" boolean DEFAULT false NOT NULL,
	"last_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "parents" ADD COLUMN "alert_on_distress" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "parents" ADD COLUMN "last_distress_alert_day" text;--> statement-breakpoint
ALTER TABLE "question_logs" ADD COLUMN "thread_id" uuid;--> statement-breakpoint
ALTER TABLE "threads" ADD CONSTRAINT "threads_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "threads_child_idx" ON "threads" USING btree ("child_id","last_at");--> statement-breakpoint
ALTER TABLE "question_logs" ADD CONSTRAINT "question_logs_thread_id_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."threads"("id") ON DELETE set null ON UPDATE no action;