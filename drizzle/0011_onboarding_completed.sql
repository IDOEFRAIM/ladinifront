-- 0011: Add onboarding_completed column to users table
-- Existing users with a role other than USER and a zoneId set are considered onboarded.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = 'onboarding_completed'
  ) THEN
    ALTER TABLE auth.users ADD COLUMN onboarding_completed boolean NOT NULL DEFAULT false;

    -- Mark existing users who already have a proper role AND a zone as onboarded
    UPDATE auth.users
    SET onboarding_completed = true
    WHERE role IN ('PRODUCER', 'BUYER', 'AGENT', 'ADMIN', 'SUPERADMIN')
      AND zone_id IS NOT NULL;
  END IF;
END $$;
