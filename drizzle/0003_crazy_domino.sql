CREATE TABLE "marketplace"."seed_allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"zone_id" uuid NOT NULL,
	"seed_type" text NOT NULL,
	"total_quantity" numeric(14, 3) NOT NULL,
	"remaining_quantity" numeric(14, 3) NOT NULL,
	"unit" text DEFAULT 'KG' NOT NULL,
	"allocated_by_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketplace"."seed_distribution_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"distribution_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"attempt_type" text NOT NULL,
	"success" boolean NOT NULL,
	"ip_address" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketplace"."seed_distributions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"allocation_id" uuid NOT NULL,
	"producer_id" uuid NOT NULL,
	"agent_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"zone_id" uuid NOT NULL,
	"quantity" numeric(14, 3) NOT NULL,
	"cnib_provided" text,
	"verification_code_hash" text,
	"verification_code_expires_at" timestamp,
	"verification_channel" text DEFAULT 'IN_APP' NOT NULL,
	"attempts_count" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"metadata" jsonb,
	"receipt_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "marketplace"."seed_allocations" ADD CONSTRAINT "seed_allocations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "governance"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace"."seed_allocations" ADD CONSTRAINT "seed_allocations_zone_id_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "governance"."zones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace"."seed_allocations" ADD CONSTRAINT "seed_allocations_allocated_by_id_users_id_fk" FOREIGN KEY ("allocated_by_id") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace"."seed_distribution_attempts" ADD CONSTRAINT "seed_distribution_attempts_distribution_id_seed_distributions_id_fk" FOREIGN KEY ("distribution_id") REFERENCES "marketplace"."seed_distributions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace"."seed_distributions" ADD CONSTRAINT "seed_distributions_allocation_id_seed_allocations_id_fk" FOREIGN KEY ("allocation_id") REFERENCES "marketplace"."seed_allocations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace"."seed_distributions" ADD CONSTRAINT "seed_distributions_producer_id_producers_id_fk" FOREIGN KEY ("producer_id") REFERENCES "marketplace"."producers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace"."seed_distributions" ADD CONSTRAINT "seed_distributions_agent_id_users_id_fk" FOREIGN KEY ("agent_id") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace"."seed_distributions" ADD CONSTRAINT "seed_distributions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "governance"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace"."seed_distributions" ADD CONSTRAINT "seed_distributions_zone_id_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "governance"."zones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "seed_allocations_org_idx" ON "marketplace"."seed_allocations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "seed_allocations_zone_idx" ON "marketplace"."seed_allocations" USING btree ("zone_id");--> statement-breakpoint
CREATE INDEX "seed_dist_attempts_distribution_idx" ON "marketplace"."seed_distribution_attempts" USING btree ("distribution_id");--> statement-breakpoint
CREATE INDEX "seed_distributions_allocation_idx" ON "marketplace"."seed_distributions" USING btree ("allocation_id");--> statement-breakpoint
CREATE INDEX "seed_distributions_producer_idx" ON "marketplace"."seed_distributions" USING btree ("producer_id");--> statement-breakpoint
CREATE INDEX "seed_distributions_agent_idx" ON "marketplace"."seed_distributions" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "seed_distributions_org_idx" ON "marketplace"."seed_distributions" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "seed_distributions_status_idx" ON "marketplace"."seed_distributions" USING btree ("status");