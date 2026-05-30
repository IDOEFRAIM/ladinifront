ALTER TABLE "marketplace"."auctions" ADD COLUMN "incoterm" text;--> statement-breakpoint
ALTER TABLE "marketplace"."auctions" ADD COLUMN "delivery_location" text;--> statement-breakpoint
ALTER TABLE "marketplace"."auctions" ADD COLUMN "delivery_deadline" timestamp;