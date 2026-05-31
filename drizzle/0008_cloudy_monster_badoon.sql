ALTER TABLE "auth"."users" ADD COLUMN "onboarding_completed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "marketplace"."crop_cycles" ADD COLUMN "production_type" text DEFAULT 'CROP' NOT NULL;--> statement-breakpoint
ALTER TABLE "marketplace"."crop_cycles" ADD COLUMN "species" text;--> statement-breakpoint
ALTER TABLE "marketplace"."crop_cycles" ADD COLUMN "breed" text;--> statement-breakpoint
ALTER TABLE "marketplace"."crop_cycles" ADD COLUMN "initial_stock" double precision DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "marketplace"."crop_cycles" ADD COLUMN "current_stock" double precision DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "marketplace"."crop_cycles" ADD COLUMN "hatch_date" timestamp;