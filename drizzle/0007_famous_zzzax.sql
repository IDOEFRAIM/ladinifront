ALTER TABLE "marketplace"."auctions" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "marketplace"."auctions" ADD COLUMN "winner_bid_id" uuid;--> statement-breakpoint
ALTER TABLE "marketplace"."auctions" ADD COLUMN "awarded_at" timestamp;--> statement-breakpoint
ALTER TABLE "marketplace"."auctions" ADD COLUMN "cancelled_at" timestamp;--> statement-breakpoint
ALTER TABLE "marketplace"."auctions" ADD COLUMN "cancellation_reason" text;--> statement-breakpoint
ALTER TABLE "marketplace"."bids" ADD COLUMN "status" text DEFAULT 'PENDING' NOT NULL;--> statement-breakpoint
ALTER TABLE "marketplace"."bids" ADD COLUMN "message" text;--> statement-breakpoint
ALTER TABLE "marketplace"."bids" ADD COLUMN "notified_at" timestamp;--> statement-breakpoint
ALTER TABLE "marketplace"."bids" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "marketplace"."crop_cycles" ADD COLUMN "target_yield" double precision;--> statement-breakpoint
ALTER TABLE "marketplace"."farms" ADD CONSTRAINT "farms_zone_id_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "governance"."zones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace"."farms" ADD CONSTRAINT "farms_producer_id_producers_id_fk" FOREIGN KEY ("producer_id") REFERENCES "marketplace"."producers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "auctions_buyer_idx" ON "marketplace"."auctions" USING btree ("buyer_id");--> statement-breakpoint
CREATE INDEX "bids_status_idx" ON "marketplace"."bids" USING btree ("status");