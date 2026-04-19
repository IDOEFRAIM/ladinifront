-- Add CNIB and identity verification fields to auth.users if missing
CREATE SCHEMA IF NOT EXISTS auth;

ALTER TABLE IF EXISTS auth.users
  ADD COLUMN IF NOT EXISTS cnib_number text;

ALTER TABLE IF EXISTS auth.users
  ADD COLUMN IF NOT EXISTS identity_verified boolean DEFAULT false;

-- Optional unique index on cnib_number (NULLs allowed)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'auth_users_cnib_number_idx'
  ) THEN
    BEGIN
      EXECUTE 'CREATE UNIQUE INDEX auth_users_cnib_number_idx ON auth.users (cnib_number)';
    EXCEPTION WHEN others THEN
      -- ignore (e.g., if cnib_number already has non-unique values)
      RAISE NOTICE 'Could not create unique index auth_users_cnib_number_idx, skipping';
    END;
  END IF;
END$$;
