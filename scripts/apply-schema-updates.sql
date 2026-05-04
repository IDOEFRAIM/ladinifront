-- Schema updates for B2B + Logistics + Auction system activation
-- Run this against your database to add the new columns

-- 1. buyerProfiles: trust badge system
ALTER TABLE marketplace.buyer_profiles ADD COLUMN IF NOT EXISTS trust_badge TEXT;
ALTER TABLE marketplace.buyer_profiles ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP;
ALTER TABLE marketplace.buyer_profiles ADD COLUMN IF NOT EXISTS verified_by_id UUID;

-- 2. deliveries: OTP + origin GPS + estimated distance
ALTER TABLE marketplace.deliveries ADD COLUMN IF NOT EXISTS delivery_code TEXT;
ALTER TABLE marketplace.deliveries ADD COLUMN IF NOT EXISTS origin_gps_lat DOUBLE PRECISION;
ALTER TABLE marketplace.deliveries ADD COLUMN IF NOT EXISTS origin_gps_lng DOUBLE PRECISION;
ALTER TABLE marketplace.deliveries ADD COLUMN IF NOT EXISTS estimated_distance_km DOUBLE PRECISION;

-- 3. Update default status for deliveries (new rows will use PENDING)
ALTER TABLE marketplace.deliveries ALTER COLUMN status SET DEFAULT 'PENDING';
