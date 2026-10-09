CREATE TABLE "safety_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"child_id" uuid,
	"stage" text NOT NULL,
	"route" text NOT NULL,
	"detector" text NOT NULL,
	"category" text NOT NULL,
	"excerpt" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "safety_events" ADD CONSTRAINT "safety_events_child_id_children_id_fk" FOREIGN KEY ("child_id") REFERENCES "public"."children"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "safety_events_created_idx" ON "safety_events" USING btree ("created_at");