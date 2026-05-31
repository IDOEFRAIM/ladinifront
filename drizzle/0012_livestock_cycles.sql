-- 0012: extend crop_cycles for livestock support

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'marketplace' AND table_name = 'crop_cycles' AND column_name = 'production_type'
  ) THEN
    ALTER TABLE marketplace.crop_cycles
      ADD COLUMN production_type text NOT NULL DEFAULT 'CROP';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'marketplace' AND table_name = 'crop_cycles' AND column_name = 'species'
  ) THEN
    ALTER TABLE marketplace.crop_cycles ADD COLUMN species text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'marketplace' AND table_name = 'crop_cycles' AND column_name = 'breed'
  ) THEN
    ALTER TABLE marketplace.crop_cycles ADD COLUMN breed text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'marketplace' AND table_name = 'crop_cycles' AND column_name = 'initial_stock'
  ) THEN
    ALTER TABLE marketplace.crop_cycles ADD COLUMN initial_stock double precision NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'marketplace' AND table_name = 'crop_cycles' AND column_name = 'current_stock'
  ) THEN
    ALTER TABLE marketplace.crop_cycles ADD COLUMN current_stock double precision NOT NULL DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'marketplace' AND table_name = 'crop_cycles' AND column_name = 'hatch_date'
  ) THEN
    ALTER TABLE marketplace.crop_cycles ADD COLUMN hatch_date timestamp;
  END IF;
END $$;
