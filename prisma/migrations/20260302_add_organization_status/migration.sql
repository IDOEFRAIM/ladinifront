-- Migration: add Organization.status enum + column
-- Generated: 2026-03-02

-- 1) Create enum type if missing
DO $$
BEGIN
  -- Check both unquoted (lowercase) and quoted (exact case) typnames
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'orgstatus' OR typname = 'OrgStatus') THEN
    CREATE TYPE "OrgStatus" AS ENUM ('PENDING','ACTIVE','SUSPENDED');
  END IF;
END$$;

-- 2) Add nullable column if it doesn't exist (fast catalog change)
ALTER TABLE IF EXISTS organizations ADD COLUMN IF NOT EXISTS status "OrgStatus";

-- 3) Backfill existing rows
UPDATE organizations SET status = 'PENDING' WHERE status IS NULL;

-- 4) Set default for future inserts
ALTER TABLE organizations ALTER COLUMN status SET DEFAULT 'PENDING';

-- 5) Make column NOT NULL now that backfill is done
ALTER TABLE organizations ALTER COLUMN status SET NOT NULL;

-- Note: This migration is safe for small-to-medium tables. For very large tables,
-- consider performing the backfill in batched updates outside of the migration to
-- avoid long-running locks.
