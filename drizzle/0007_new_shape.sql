ALTER TABLE "marketplace"."crop_cycles" ADD COLUMN "sub_category_id" uuid;--> statement-breakpoint
ALTER TABLE "marketplace"."crop_cycles" ADD COLUMN "growth_stage" text;--> statement-breakpoint
ALTER TABLE "marketplace"."crop_cycles" ADD COLUMN "is_public" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "marketplace"."crop_cycles" ADD COLUMN "preorder_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "marketplace"."crop_cycles" ADD COLUMN "estimated_available_at" timestamp;--> statement-breakpoint
ALTER TABLE "marketplace"."crop_cycles" ADD COLUMN "available_quantity" double precision DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "marketplace"."crop_cycles" ADD COLUMN "reserved_quantity" double precision DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "marketplace"."crop_cycles" ADD COLUMN "price_per_unit" double precision;--> statement-breakpoint
ALTER TABLE "marketplace"."crop_cycles" ADD COLUMN "unit" text DEFAULT 'KG' NOT NULL;--> statement-breakpoint
ALTER TABLE "marketplace"."orders" ADD COLUMN "order_type" varchar DEFAULT 'STANDARD' NOT NULL;--> statement-breakpoint
ALTER TABLE "marketplace"."orders" ADD COLUMN "crop_cycle_id" uuid;--> statement-breakpoint
ALTER TABLE "marketplace"."orders" ADD COLUMN "expected_fulfillment_date" timestamp;--> statement-breakpoint
ALTER TABLE "marketplace"."orders" ADD COLUMN "preorder_converted_at" timestamp;--> statement-breakpoint
ALTER TABLE "marketplace"."orders" ADD CONSTRAINT "orders_crop_cycle_id_crop_cycles_id_fk" FOREIGN KEY ("crop_cycle_id") REFERENCES "marketplace"."crop_cycles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "crop_cycles_subcategory_idx" ON "marketplace"."crop_cycles" USING btree ("sub_category_id");--> statement-breakpoint
CREATE INDEX "crop_cycles_public_idx" ON "marketplace"."crop_cycles" USING btree ("is_public");--> statement-breakpoint
CREATE INDEX "crop_cycles_preorder_idx" ON "marketplace"."crop_cycles" USING btree ("preorder_enabled");--> statement-breakpoint
CREATE INDEX "crop_cycles_available_at_idx" ON "marketplace"."crop_cycles" USING btree ("estimated_available_at");--> statement-breakpoint
CREATE INDEX "orders_type_idx" ON "marketplace"."orders" USING btree ("order_type");--> statement-breakpoint
CREATE INDEX "orders_crop_cycle_idx" ON "marketplace"."orders" USING btree ("crop_cycle_id");