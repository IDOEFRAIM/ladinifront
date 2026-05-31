-- LADINI V2 — Phase 2 (Production future) & Phase 3 (Précommandes)
-- Migration additive et idempotente. Réutilise crop_cycles et orders existants.
-- Aucune table créée : extension uniquement.

-- ─────────────────────────────────────────────────────────────
-- Phase 2 : crop_cycles (production future / visibilité / précommande)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE "marketplace"."crop_cycles" ADD COLUMN IF NOT EXISTS "sub_category_id" uuid;
ALTER TABLE "marketplace"."crop_cycles" ADD COLUMN IF NOT EXISTS "growth_stage" text;
ALTER TABLE "marketplace"."crop_cycles" ADD COLUMN IF NOT EXISTS "is_public" boolean DEFAULT false NOT NULL;
ALTER TABLE "marketplace"."crop_cycles" ADD COLUMN IF NOT EXISTS "preorder_enabled" boolean DEFAULT false NOT NULL;
ALTER TABLE "marketplace"."crop_cycles" ADD COLUMN IF NOT EXISTS "estimated_available_at" timestamp;
ALTER TABLE "marketplace"."crop_cycles" ADD COLUMN IF NOT EXISTS "available_quantity" double precision DEFAULT 0 NOT NULL;
ALTER TABLE "marketplace"."crop_cycles" ADD COLUMN IF NOT EXISTS "reserved_quantity" double precision DEFAULT 0 NOT NULL;
ALTER TABLE "marketplace"."crop_cycles" ADD COLUMN IF NOT EXISTS "price_per_unit" double precision;
ALTER TABLE "marketplace"."crop_cycles" ADD COLUMN IF NOT EXISTS "unit" text DEFAULT 'KG' NOT NULL;

CREATE INDEX IF NOT EXISTS "crop_cycles_subcategory_idx" ON "marketplace"."crop_cycles" ("sub_category_id");
CREATE INDEX IF NOT EXISTS "crop_cycles_public_idx" ON "marketplace"."crop_cycles" ("is_public");
CREATE INDEX IF NOT EXISTS "crop_cycles_preorder_idx" ON "marketplace"."crop_cycles" ("preorder_enabled");
CREATE INDEX IF NOT EXISTS "crop_cycles_available_at_idx" ON "marketplace"."crop_cycles" ("estimated_available_at");

-- ─────────────────────────────────────────────────────────────
-- Phase 3 : orders (précommandes liées à une production future)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE "marketplace"."orders" ADD COLUMN IF NOT EXISTS "order_type" varchar DEFAULT 'STANDARD' NOT NULL;
ALTER TABLE "marketplace"."orders" ADD COLUMN IF NOT EXISTS "crop_cycle_id" uuid;
ALTER TABLE "marketplace"."orders" ADD COLUMN IF NOT EXISTS "expected_fulfillment_date" timestamp;
ALTER TABLE "marketplace"."orders" ADD COLUMN IF NOT EXISTS "preorder_converted_at" timestamp;

CREATE INDEX IF NOT EXISTS "orders_type_idx" ON "marketplace"."orders" ("order_type");
CREATE INDEX IF NOT EXISTS "orders_crop_cycle_idx" ON "marketplace"."orders" ("crop_cycle_id");

-- Clé étrangère orders.crop_cycle_id -> crop_cycles.id (ajout conditionnel)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'orders_crop_cycle_id_crop_cycles_id_fk'
      AND table_schema = 'marketplace'
  ) THEN
    ALTER TABLE "marketplace"."orders"
      ADD CONSTRAINT "orders_crop_cycle_id_crop_cycles_id_fk"
      FOREIGN KEY ("crop_cycle_id") REFERENCES "marketplace"."crop_cycles"("id");
  END IF;
END $$;
