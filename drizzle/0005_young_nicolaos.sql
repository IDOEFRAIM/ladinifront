ALTER TABLE "marketplace"."deliveries" ALTER COLUMN "status" SET DEFAULT 'PENDING';--> statement-breakpoint
ALTER TABLE "marketplace"."buyer_profiles" ADD COLUMN "trust_badge" text;--> statement-breakpoint
ALTER TABLE "marketplace"."buyer_profiles" ADD COLUMN "verified_at" timestamp;--> statement-breakpoint
ALTER TABLE "marketplace"."buyer_profiles" ADD COLUMN "verified_by_id" uuid;--> statement-breakpoint
ALTER TABLE "marketplace"."deliveries" ADD COLUMN "delivery_code" text;--> statement-breakpoint
ALTER TABLE "marketplace"."deliveries" ADD COLUMN "origin_gps_lat" double precision;--> statement-breakpoint
ALTER TABLE "marketplace"."deliveries" ADD COLUMN "origin_gps_lng" double precision;--> statement-breakpoint
ALTER TABLE "marketplace"."deliveries" ADD COLUMN "estimated_distance_km" double precision;