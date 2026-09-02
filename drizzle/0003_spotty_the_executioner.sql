ALTER TABLE "marketplace"."auctions" ADD COLUMN "images" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "marketplace"."bids" ADD COLUMN "images" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "marketplace"."order_items" ADD COLUMN "tier_id" text;--> statement-breakpoint
ALTER TABLE "marketplace"."order_items" ADD COLUMN "base_unit_quantity" numeric(14, 3);--> statement-breakpoint
ALTER TABLE "marketplace"."orders" ADD COLUMN "paydunya_invoice_token" text;--> statement-breakpoint
ALTER TABLE "marketplace"."orders" ADD COLUMN "delivery_otp" text;--> statement-breakpoint
ALTER TABLE "marketplace"."orders" ADD COLUMN "payment_expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "marketplace"."orders" ADD COLUMN "locked_amount" numeric(14, 2);