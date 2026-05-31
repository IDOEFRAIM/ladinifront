ALTER TABLE "marketplace"."auctions" ALTER COLUMN "incoterm" SET DEFAULT 'DDP';--> statement-breakpoint
ALTER TABLE "marketplace"."auctions" ALTER COLUMN "incoterm" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "marketplace"."auctions" ALTER COLUMN "delivery_location" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "marketplace"."auctions" ALTER COLUMN "delivery_deadline" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "marketplace"."auctions" ADD COLUMN "quality_grading" text;--> statement-breakpoint
ALTER TABLE "marketplace"."auctions" ADD COLUMN "required_certifications" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "marketplace"."auctions" ADD COLUMN "preferred_packaging" text;--> statement-breakpoint
ALTER TABLE "marketplace"."orders" ADD COLUMN "delivery_date" timestamp;--> statement-breakpoint
ALTER TABLE "marketplace"."orders" ADD COLUMN "subtotal" double precision DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "marketplace"."orders" ADD COLUMN "tax_amount" double precision DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "marketplace"."orders" ADD COLUMN "currency" text DEFAULT 'XOF' NOT NULL;--> statement-breakpoint
ALTER TABLE "marketplace"."orders" ADD COLUMN "delivery_fee" double precision DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "marketplace"."orders" ADD COLUMN "cancellation_role" text;--> statement-breakpoint
ALTER TABLE "marketplace"."orders" ADD COLUMN "escrow_wallet_id" uuid;--> statement-breakpoint
ALTER TABLE "marketplace"."products" ADD COLUMN "quality_class" text;--> statement-breakpoint
ALTER TABLE "marketplace"."products" ADD COLUMN "min_order_quality" text;--> statement-breakpoint
ALTER TABLE "marketplace"."products" ADD COLUMN "packaging_type" text;--> statement-breakpoint
ALTER TABLE "marketplace"."products" ADD COLUMN "harvest_date" timestamp;--> statement-breakpoint
ALTER TABLE "marketplace"."products" ADD COLUMN "is_available" boolean DEFAULT true NOT NULL;