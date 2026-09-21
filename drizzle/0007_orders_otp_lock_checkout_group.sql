-- Ces colonnes existent déjà en base (créées par le backend Python via
-- SCHEMA_COLUMN_DDL). IF NOT EXISTS : la migration est un simple alignement du
-- snapshot Drizzle et doit passer que la base les ait déjà ou non.
ALTER TABLE "marketplace"."orders" ADD COLUMN IF NOT EXISTS "delivery_otp_attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "marketplace"."orders" ADD COLUMN IF NOT EXISTS "delivery_otp_locked_until" timestamp;--> statement-breakpoint
ALTER TABLE "marketplace"."orders" ADD COLUMN IF NOT EXISTS "checkout_group_id" uuid;
