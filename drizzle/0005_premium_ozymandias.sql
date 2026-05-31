ALTER TABLE "marketplace"."buyer_profiles" ADD COLUMN "rating" double precision;--> statement-breakpoint
ALTER TABLE "marketplace"."buyer_profiles" ADD COLUMN "reviews_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "marketplace"."buyer_profiles" ADD COLUMN "company_registration_number" text;