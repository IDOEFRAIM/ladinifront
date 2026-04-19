-- Idempotent migration to add inventory tables (seed allocations & distributions)
-- Safe: uses IF NOT EXISTS guards so re-running won't error if objects already exist

CREATE SCHEMA IF NOT EXISTS marketplace;

-- Seed allocations: stock assigned by an organization to a zone
CREATE TABLE IF NOT EXISTS marketplace.seed_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL,
  zone_id uuid NOT NULL,
  seed_type text NOT NULL,
  total_quantity integer NOT NULL,
  remaining_quantity integer NOT NULL,
  unit text NOT NULL DEFAULT 'KG',
  allocated_by_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS seed_allocations_org_idx ON marketplace.seed_allocations (organization_id);
CREATE INDEX IF NOT EXISTS seed_allocations_zone_idx ON marketplace.seed_allocations (zone_id);
CREATE INDEX IF NOT EXISTS seed_allocations_seedtype_idx ON marketplace.seed_allocations (seed_type);

-- Seed distributions: proof of handover and verification data
CREATE TABLE IF NOT EXISTS marketplace.seed_distributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  allocation_id uuid NOT NULL,
  producer_id uuid NOT NULL,
  agent_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  zone_id uuid NOT NULL,
  quantity integer NOT NULL,
  cnib_provided text,
  verification_code_hash text,
  verification_code_expires_at timestamptz,
  verification_channel text NOT NULL DEFAULT 'IN_APP',
  attempts_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'PENDING',
  receipt_at timestamptz,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS seed_distributions_alloc_idx ON marketplace.seed_distributions (allocation_id);
CREATE INDEX IF NOT EXISTS seed_distributions_producer_idx ON marketplace.seed_distributions (producer_id);
CREATE INDEX IF NOT EXISTS seed_distributions_agent_idx ON marketplace.seed_distributions (agent_id);
CREATE INDEX IF NOT EXISTS seed_distributions_status_idx ON marketplace.seed_distributions (status);

-- Attempts for verification (success or failure)
CREATE TABLE IF NOT EXISTS marketplace.seed_distribution_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  distribution_id uuid NOT NULL,
  actor_id uuid,
  attempt_type text,
  success boolean NOT NULL DEFAULT false,
  ip_address text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sda_distribution_idx ON marketplace.seed_distribution_attempts (distribution_id);
CREATE INDEX IF NOT EXISTS sda_actor_idx ON marketplace.seed_distribution_attempts (actor_id);

-- Note: functions like gen_random_uuid() require the pgcrypto or pgcrypto-like
-- extension. If unavailable, replace DEFAULT gen_random_uuid() with
-- DEFAULT uuid_generate_v4() after installing the "uuid-ossp" extension, or
-- omit defaults and let application code provide UUIDs.
