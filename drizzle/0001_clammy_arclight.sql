CREATE TABLE "intelligence"."notification_outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"solicitation_id" uuid,
	"channel" text NOT NULL,
	"recipient_user_id" uuid,
	"recipient_phone" text,
	"template_key" text NOT NULL,
	"payload" jsonb NOT NULL,
	"dedupe_key" text NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 5 NOT NULL,
	"next_attempt_at" timestamp DEFAULT now() NOT NULL,
	"last_error" text,
	"sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "intelligence"."solicitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"auction_id" uuid,
	"market_offer_id" uuid,
	"target_producer_id" uuid,
	"target_buyer_id" uuid,
	"sub_category_id" uuid,
	"zone_id" uuid,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"notified_at" timestamp,
	"responded_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "outbox_dedupe_uq" ON "intelligence"."notification_outbox" USING btree ("dedupe_key");--> statement-breakpoint
CREATE INDEX "outbox_due_idx" ON "intelligence"."notification_outbox" USING btree ("status","next_attempt_at");--> statement-breakpoint
CREATE INDEX "outbox_solicitation_idx" ON "intelligence"."notification_outbox" USING btree ("solicitation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "solicitations_auction_producer_uq" ON "intelligence"."solicitations" USING btree ("auction_id","target_producer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "solicitations_offer_buyer_uq" ON "intelligence"."solicitations" USING btree ("market_offer_id","target_buyer_id");--> statement-breakpoint
CREATE INDEX "solicitations_kind_status_idx" ON "intelligence"."solicitations" USING btree ("kind","status");--> statement-breakpoint
CREATE INDEX "solicitations_auction_idx" ON "intelligence"."solicitations" USING btree ("auction_id");