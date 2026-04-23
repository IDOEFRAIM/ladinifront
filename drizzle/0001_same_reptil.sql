ALTER TABLE "auth"."users" ADD COLUMN IF NOT EXISTS "cnib_number" text;--> statement-breakpoint
ALTER TABLE "auth"."users" ADD COLUMN IF NOT EXISTS "identity_verified" boolean DEFAULT false;--> statement-breakpoint
DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1 FROM pg_constraint WHERE conname = 'users_cnib_number_unique'
	) THEN
		ALTER TABLE "auth"."users" ADD CONSTRAINT "users_cnib_number_unique" UNIQUE("cnib_number");
	END IF;
END$$;