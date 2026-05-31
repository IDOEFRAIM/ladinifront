CREATE TABLE "marketplace"."order_disputes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"escrow_wallet_id" uuid,
	"raised_by_id" uuid NOT NULL,
	"reason_category" varchar NOT NULL,
	"description" text NOT NULL,
	"evidence_images" text[] DEFAULT '{}'::text[] NOT NULL,
	"requested_solution" varchar NOT NULL,
	"disputed_amount" real DEFAULT 0 NOT NULL,
	"escrow_payout_status" varchar DEFAULT 'HELD' NOT NULL,
	"status" varchar DEFAULT 'PENDING' NOT NULL,
	"resolution_notes" text,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "marketplace"."order_items" ALTER COLUMN "quantity" SET DATA TYPE real;--> statement-breakpoint
ALTER TABLE "marketplace"."order_items" ALTER COLUMN "price_at_sale" SET DATA TYPE real;--> statement-breakpoint
ALTER TABLE "marketplace"."orders" ALTER COLUMN "customer_name" SET DATA TYPE varchar;--> statement-breakpoint
ALTER TABLE "marketplace"."orders" ALTER COLUMN "customer_phone" SET DATA TYPE varchar;--> statement-breakpoint
ALTER TABLE "marketplace"."orders" ALTER COLUMN "payment_method" SET DATA TYPE varchar;--> statement-breakpoint
ALTER TABLE "marketplace"."orders" ALTER COLUMN "payment_method" SET DEFAULT 'CASH';--> statement-breakpoint
ALTER TABLE "marketplace"."orders" ALTER COLUMN "payment_status" SET DATA TYPE varchar;--> statement-breakpoint
ALTER TABLE "marketplace"."orders" ALTER COLUMN "payment_status" SET DEFAULT 'PENDING';--> statement-breakpoint
ALTER TABLE "marketplace"."orders" ALTER COLUMN "city" SET DATA TYPE varchar;--> statement-breakpoint
ALTER TABLE "marketplace"."orders" ALTER COLUMN "gps_lat" SET DATA TYPE real;--> statement-breakpoint
ALTER TABLE "marketplace"."orders" ALTER COLUMN "gps_lng" SET DATA TYPE real;--> statement-breakpoint
ALTER TABLE "marketplace"."orders" ALTER COLUMN "audio_url" SET DATA TYPE varchar;--> statement-breakpoint
ALTER TABLE "marketplace"."orders" ALTER COLUMN "status" SET DATA TYPE varchar;--> statement-breakpoint
ALTER TABLE "marketplace"."orders" ALTER COLUMN "status" SET DEFAULT 'PENDING';--> statement-breakpoint
ALTER TABLE "marketplace"."orders" ALTER COLUMN "delivery_status" SET DATA TYPE varchar;--> statement-breakpoint
ALTER TABLE "marketplace"."orders" ALTER COLUMN "delivery_status" SET DEFAULT 'PENDING';--> statement-breakpoint
ALTER TABLE "marketplace"."orders" ALTER COLUMN "source" SET DATA TYPE varchar;--> statement-breakpoint
ALTER TABLE "marketplace"."orders" ALTER COLUMN "source" SET DEFAULT 'APP';--> statement-breakpoint
ALTER TABLE "marketplace"."orders" ALTER COLUMN "whatsapp_id" SET DATA TYPE varchar;--> statement-breakpoint
ALTER TABLE "marketplace"."orders" ALTER COLUMN "total_amount" SET DATA TYPE real;--> statement-breakpoint
ALTER TABLE "marketplace"."orders" ALTER COLUMN "subtotal" SET DATA TYPE real;--> statement-breakpoint
ALTER TABLE "marketplace"."orders" ALTER COLUMN "tax_amount" SET DATA TYPE real;--> statement-breakpoint
ALTER TABLE "marketplace"."orders" ALTER COLUMN "currency" SET DATA TYPE varchar;--> statement-breakpoint
ALTER TABLE "marketplace"."orders" ALTER COLUMN "currency" SET DEFAULT 'XOF';--> statement-breakpoint
ALTER TABLE "marketplace"."orders" ALTER COLUMN "delivery_fee" SET DATA TYPE real;--> statement-breakpoint
ALTER TABLE "marketplace"."orders" ALTER COLUMN "cancellation_role" SET DATA TYPE varchar;--> statement-breakpoint
ALTER TABLE "marketplace"."auctions" ADD COLUMN "escrow_wallet_id" uuid;--> statement-breakpoint
ALTER TABLE "marketplace"."order_disputes" ADD CONSTRAINT "order_disputes_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "marketplace"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "order_disputes_order_idx" ON "marketplace"."order_disputes" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_disputes_status_idx" ON "marketplace"."order_disputes" USING btree ("status");--> statement-breakpoint
CREATE INDEX "order_disputes_raised_by_idx" ON "marketplace"."order_disputes" USING btree ("raised_by_id");--> statement-breakpoint
CREATE INDEX "order_disputes_escrow_idx" ON "marketplace"."order_disputes" USING btree ("escrow_wallet_id");--> statement-breakpoint
ALTER TABLE "marketplace"."order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "marketplace"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace"."order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "marketplace"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace"."orders" ADD CONSTRAINT "orders_buyer_id_buyer_profiles_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "marketplace"."buyer_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace"."orders" ADD CONSTRAINT "orders_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "marketplace"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace"."orders" ADD CONSTRAINT "orders_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "governance"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace"."orders" ADD CONSTRAINT "orders_zone_id_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "governance"."zones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace"."orders" ADD CONSTRAINT "orders_auction_id_auctions_id_fk" FOREIGN KEY ("auction_id") REFERENCES "marketplace"."auctions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace"."orders" ADD CONSTRAINT "orders_winning_bid_id_bids_id_fk" FOREIGN KEY ("winning_bid_id") REFERENCES "marketplace"."bids"("id") ON DELETE no action ON UPDATE no action;