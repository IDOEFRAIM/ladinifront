CREATE TABLE IF NOT EXISTS "auth"."daily_advice_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"culture_name" text NOT NULL,
	"advice_content" text NOT NULL,
	"sent_at" timestamp DEFAULT now() NOT NULL,
	"is_useful" boolean
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "auth"."user_cultures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"culture_name" text NOT NULL,
	"planting_date" timestamp NOT NULL,
	"is_association" boolean DEFAULT false,
	"status" text DEFAULT 'active'
);
--> statement-breakpoint
ALTER TABLE "auth"."users" ADD COLUMN IF NOT EXISTS "whatsapp_enabled" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "auth"."users" ADD COLUMN IF NOT EXISTS "daily_advice_time" time DEFAULT '07:00';--> statement-breakpoint
ALTER TABLE "auth"."users" ADD COLUMN IF NOT EXISTS "latitude" double precision;--> statement-breakpoint
ALTER TABLE "auth"."users" ADD COLUMN IF NOT EXISTS "longitude" double precision;--> statement-breakpoint
ALTER TABLE "auth"."daily_advice_logs" ADD CONSTRAINT "daily_advice_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."user_cultures" ADD CONSTRAINT "user_cultures_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_cultures_user_idx" ON "auth"."user_cultures" USING btree ("user_id");