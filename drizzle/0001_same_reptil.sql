ALTER TABLE "auth"."users" ADD COLUMN "cnib_number" text;--> statement-breakpoint
ALTER TABLE "auth"."users" ADD COLUMN "identity_verified" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "auth"."users" ADD CONSTRAINT "users_cnib_number_unique" UNIQUE("cnib_number");