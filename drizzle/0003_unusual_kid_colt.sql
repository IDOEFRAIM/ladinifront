ALTER TABLE "marketplace"."producers" ADD COLUMN "logo_url" text;--> statement-breakpoint
ALTER TABLE "marketplace"."producers" ADD COLUMN "phone_number" text;--> statement-breakpoint
ALTER TABLE "marketplace"."producers" ADD COLUMN "rating" integer;--> statement-breakpoint
ALTER TABLE "marketplace"."producers" ADD COLUMN "reviews_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "marketplace"."producers" ADD COLUMN "company_registration_number" text;