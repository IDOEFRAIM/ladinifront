CREATE TABLE "marketplace"."buyer_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"buyer_type_id" uuid,
	"establishment_name" text,
	"default_delivery_address" text,
	"is_verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "buyer_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "marketplace"."buyer_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "buyer_types_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "marketplace"."deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"delivery_agent_id" uuid,
	"status" text DEFAULT 'ASSIGNED' NOT NULL,
	"destination_gps_lat" double precision,
	"destination_gps_lng" double precision,
	"destination_desc" text,
	"assigned_at" timestamp,
	"picked_up_at" timestamp,
	"delivered_at" timestamp,
	"failed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketplace"."delivery_agents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"vehicle_type" text,
	"license_number" text,
	"zone_id" uuid,
	"status" text DEFAULT 'OFFLINE' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "delivery_agents_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "marketplace"."auctions" ADD COLUMN "auto_extend" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "marketplace"."auctions" ADD COLUMN "escrow_status" text DEFAULT 'NONE' NOT NULL;--> statement-breakpoint
ALTER TABLE "marketplace"."bids" ADD COLUMN "linked_stock_id" uuid;--> statement-breakpoint
ALTER TABLE "marketplace"."orders" ADD COLUMN "delivery_status" text DEFAULT 'PENDING' NOT NULL;--> statement-breakpoint
ALTER TABLE "marketplace"."orders" ADD COLUMN "auction_id" uuid;--> statement-breakpoint
ALTER TABLE "marketplace"."orders" ADD COLUMN "winning_bid_id" uuid;--> statement-breakpoint
CREATE INDEX "buyer_profiles_user_idx" ON "marketplace"."buyer_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "buyer_profiles_type_idx" ON "marketplace"."buyer_profiles" USING btree ("buyer_type_id");--> statement-breakpoint
CREATE INDEX "buyer_profiles_verified_idx" ON "marketplace"."buyer_profiles" USING btree ("is_verified");--> statement-breakpoint
CREATE UNIQUE INDEX "deliveries_order_unique" ON "marketplace"."deliveries" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "deliveries_agent_idx" ON "marketplace"."deliveries" USING btree ("delivery_agent_id");--> statement-breakpoint
CREATE INDEX "deliveries_status_idx" ON "marketplace"."deliveries" USING btree ("status");--> statement-breakpoint
CREATE INDEX "delivery_agents_zone_idx" ON "marketplace"."delivery_agents" USING btree ("zone_id");--> statement-breakpoint
CREATE INDEX "delivery_agents_status_idx" ON "marketplace"."delivery_agents" USING btree ("status");--> statement-breakpoint
CREATE INDEX "auctions_escrow_status_idx" ON "marketplace"."auctions" USING btree ("escrow_status");--> statement-breakpoint
CREATE INDEX "bids_linked_stock_idx" ON "marketplace"."bids" USING btree ("linked_stock_id");--> statement-breakpoint
CREATE INDEX "orders_delivery_status_idx" ON "marketplace"."orders" USING btree ("delivery_status");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_auction_unique" ON "marketplace"."orders" USING btree ("auction_id");--> statement-breakpoint
CREATE INDEX "orders_winning_bid_idx" ON "marketplace"."orders" USING btree ("winning_bid_id");
--> statement-breakpoint
DO $$
BEGIN
	-- Migrate marketplace.orders.buyer_id from auth.users.id -> marketplace.buyer_profiles.id
	-- Only run if we haven't already done the rename.
	IF NOT EXISTS (
		SELECT 1 FROM information_schema.columns
		WHERE table_schema = 'marketplace' AND table_name = 'orders' AND column_name = 'buyer_user_id'
	) THEN
		ALTER TABLE "marketplace"."orders" ADD COLUMN IF NOT EXISTS "buyer_profile_id" uuid;

		-- Create missing buyer_profiles for existing order buyers
		INSERT INTO "marketplace"."buyer_profiles" ("id", "user_id", "is_verified", "created_at", "updated_at")
		SELECT gen_random_uuid(), u."user_id", false, now(), now()
		FROM (
			SELECT DISTINCT "buyer_id" AS "user_id"
			FROM "marketplace"."orders"
			WHERE "buyer_id" IS NOT NULL
		) u
		LEFT JOIN "marketplace"."buyer_profiles" bp ON bp."user_id" = u."user_id"
		WHERE bp."id" IS NULL;

		-- Backfill buyer_profile_id
		UPDATE "marketplace"."orders" o
		SET "buyer_profile_id" = bp."id"
		FROM "marketplace"."buyer_profiles" bp
		WHERE o."buyer_id" IS NOT NULL
			AND o."buyer_profile_id" IS NULL
			AND bp."user_id" = o."buyer_id";

		-- Rename columns to preserve the buyer_id name but change meaning
		ALTER TABLE "marketplace"."orders" RENAME COLUMN "buyer_id" TO "buyer_user_id";
		ALTER TABLE "marketplace"."orders" RENAME COLUMN "buyer_profile_id" TO "buyer_id";

		-- Add index for the new buyer_id (buyer profile)
		CREATE INDEX IF NOT EXISTS "orders_buyer_profile_idx" ON "marketplace"."orders" USING btree ("buyer_id");
	END IF;
END $$;