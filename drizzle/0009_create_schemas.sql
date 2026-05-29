-- Ensure required schemas exist on a fresh database
-- This prevents migration failures when running on a brand-new Postgres instance

CREATE SCHEMA IF NOT EXISTS "auth";
CREATE SCHEMA IF NOT EXISTS "governance";
CREATE SCHEMA IF NOT EXISTS "marketplace";
CREATE SCHEMA IF NOT EXISTS "intelligence";
CREATE SCHEMA IF NOT EXISTS "inventory";

-- Optionally set search_path for the session when applying further SQL.
-- SET search_path = public, auth, governance, marketplace, intelligence, inventory;
