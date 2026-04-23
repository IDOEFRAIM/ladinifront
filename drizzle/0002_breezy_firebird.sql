CREATE TABLE IF NOT EXISTS "marketplace"."seed_allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"zone_id" uuid NOT NULL,
	"seed_type" text NOT NULL,
	"total_quantity" integer NOT NULL,
	"remaining_quantity" integer NOT NULL,
	"unit" text DEFAULT 'KG' NOT NULL,
	"allocated_by_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "marketplace"."seed_distribution_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"distribution_id" uuid NOT NULL,
	"actor_id" uuid,
	"attempt_type" text,
	"success" boolean DEFAULT false NOT NULL,
	"ip_address" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "marketplace"."seed_distributions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"allocation_id" uuid NOT NULL,
	"producer_id" uuid NOT NULL,
	"agent_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"zone_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"cnib_provided" text,
	"verification_code_hash" text,
	"verification_code_expires_at" timestamp,
	"verification_channel" text DEFAULT 'IN_APP',
	"attempts_count" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"receipt_at" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "seed_allocations_org_idx" ON "marketplace"."seed_allocations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "seed_allocations_zone_idx" ON "marketplace"."seed_allocations" USING btree ("zone_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "seed_allocations_seedtype_idx" ON "marketplace"."seed_allocations" USING btree ("seed_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sda_distribution_idx" ON "marketplace"."seed_distribution_attempts" USING btree ("distribution_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sda_actor_idx" ON "marketplace"."seed_distribution_attempts" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "seed_distributions_alloc_idx" ON "marketplace"."seed_distributions" USING btree ("allocation_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "seed_distributions_producer_idx" ON "marketplace"."seed_distributions" USING btree ("producer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "seed_distributions_agent_idx" ON "marketplace"."seed_distributions" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "seed_distributions_status_idx" ON "marketplace"."seed_distributions" USING btree ("status");