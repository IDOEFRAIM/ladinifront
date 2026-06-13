DROP INDEX "intelligence"."wdl_farm_date_source_unique";--> statement-breakpoint
ALTER TABLE "intelligence"."crop_fertilizer_steps" ALTER COLUMN "nutrient_target" SET DEFAULT '{"N":0,"P2O5":0,"K2O":0,"CaO":0,"MgO":0}'::jsonb;--> statement-breakpoint
ALTER TABLE "intelligence"."crop_fertilizer_steps" ADD COLUMN "bbch_scale_code" varchar(20);--> statement-breakpoint
ALTER TABLE "intelligence"."crop_fertilizer_steps" ADD COLUMN "efficiency_factor" numeric(3, 2) DEFAULT '1.00';--> statement-breakpoint
ALTER TABLE "intelligence"."crop_profiles" ADD COLUMN "max_temperature_c" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "intelligence"."crop_profiles" ADD COLUMN "kc_stages" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "intelligence"."crop_profiles" ADD COLUMN "critical_stops_drought" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "intelligence"."crop_profiles" ADD COLUMN "nutrient_requirements_per_ton" jsonb DEFAULT '{"N":0,"P2O5":0,"K2O":0,"CaO":0,"MgO":0}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "intelligence"."crop_profiles" ADD COLUMN "salinity_tolerance_ec" numeric(4, 2);--> statement-breakpoint
ALTER TABLE "intelligence"."soil_analyses" ADD COLUMN "salinity_ec" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "intelligence"."soil_analyses" ADD COLUMN "cation_exchange_capacity" numeric(6, 2);--> statement-breakpoint
ALTER TABLE "intelligence"."soil_analyses" ADD COLUMN "carbon_nitrogen_ratio" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "intelligence"."soil_analyses" ADD COLUMN "calcium_ppm" numeric(8, 2);--> statement-breakpoint
ALTER TABLE "intelligence"."soil_analyses" ADD COLUMN "magnesium_ppm" numeric(8, 2);--> statement-breakpoint
ALTER TABLE "intelligence"."soil_analyses" ADD COLUMN "clay_percent" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "intelligence"."soil_analyses" ADD COLUMN "sand_percent" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "intelligence"."soil_analyses" ADD COLUMN "silt_percent" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "intelligence"."soil_analyses" ADD COLUMN "bulk_density" numeric(4, 2);--> statement-breakpoint
ALTER TABLE "intelligence"."soil_analyses" ADD COLUMN "wilting_point_percent" numeric(4, 2);--> statement-breakpoint
ALTER TABLE "intelligence"."soil_analyses" ADD COLUMN "field_capacity_percent" numeric(4, 2);--> statement-breakpoint
ALTER TABLE "intelligence"."weather_data_logs" ADD COLUMN "temp_dew_point" double precision;--> statement-breakpoint
ALTER TABLE "intelligence"."weather_data_logs" ADD COLUMN "precipitation_probability" integer;--> statement-breakpoint
ALTER TABLE "intelligence"."weather_data_logs" ADD COLUMN "humidity_min" double precision;--> statement-breakpoint
ALTER TABLE "intelligence"."weather_data_logs" ADD COLUMN "humidity_max" double precision;--> statement-breakpoint
ALTER TABLE "intelligence"."weather_data_logs" ADD COLUMN "wind_direction_degrees" integer;--> statement-breakpoint
ALTER TABLE "intelligence"."weather_data_logs" ADD COLUMN "wind_gusts_kmh" double precision;--> statement-breakpoint
ALTER TABLE "intelligence"."weather_data_logs" ADD COLUMN "uv_index" double precision;--> statement-breakpoint
ALTER TABLE "intelligence"."weather_data_logs" ADD COLUMN "leaf_wetness_duration_minutes" integer;--> statement-breakpoint
ALTER TABLE "intelligence"."weather_data_logs" ADD COLUMN "soil_temperature_depth_0cm" double precision;--> statement-breakpoint
ALTER TABLE "intelligence"."weather_data_logs" ADD COLUMN "soil_temperature_depth_10cm" double precision;--> statement-breakpoint
ALTER TABLE "intelligence"."weather_data_logs" ADD COLUMN "soil_moisture_volumetric_percent" double precision;--> statement-breakpoint
ALTER TABLE "intelligence"."weather_data_logs" ADD COLUMN "alert_triggers" jsonb;--> statement-breakpoint
ALTER TABLE "intelligence"."weather_data_logs" ADD COLUMN "whatsapp_pushed_alerts" jsonb;--> statement-breakpoint
ALTER TABLE "intelligence"."weather_data_logs" ADD COLUMN "forecast_horizon_days" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX "wdl_horizon_idx" ON "intelligence"."weather_data_logs" USING btree ("forecast_horizon_days");--> statement-breakpoint
CREATE UNIQUE INDEX "wdl_farm_date_source_horizon_unique" ON "intelligence"."weather_data_logs" USING btree ("farm_id","record_date","source","forecast_horizon_days");