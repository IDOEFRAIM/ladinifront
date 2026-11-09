ALTER TABLE "marketplace"."orders" ADD COLUMN "delivery_window_end" timestamp;--> statement-breakpoint
ALTER TABLE "marketplace"."orders" ADD COLUMN "delivery_asap" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "marketplace"."orders" ADD COLUMN "recipient_name" text;--> statement-breakpoint
ALTER TABLE "marketplace"."orders" ADD COLUMN "recipient_phone" text;--> statement-breakpoint
ALTER TABLE "marketplace"."orders" ADD COLUMN "delivery_fee_source" text;--> statement-breakpoint
ALTER TABLE "marketplace"."producers" ADD COLUMN "delivery_fee_amount" numeric(14, 2);--> statement-breakpoint
ALTER TABLE "marketplace"."orders" ADD CONSTRAINT "orders_delivery_fee_source_chk" CHECK ("marketplace"."orders"."delivery_fee_source" IS NULL OR "marketplace"."orders"."delivery_fee_source" IN ('PLATFORM', 'PRODUCER', 'TO_AGREE'));--> statement-breakpoint
ALTER TABLE "marketplace"."orders" ADD CONSTRAINT "orders_delivery_window_chk" CHECK ("marketplace"."orders"."delivery_window_end" IS NULL OR "marketplace"."orders"."delivery_date" IS NULL OR "marketplace"."orders"."delivery_window_end" >= "marketplace"."orders"."delivery_date");--> statement-breakpoint
ALTER TABLE "marketplace"."producers" ADD CONSTRAINT "producers_delivery_fee_amount_chk" CHECK ("marketplace"."producers"."delivery_fee_amount" IS NULL OR "marketplace"."producers"."delivery_fee_amount" >= 0);