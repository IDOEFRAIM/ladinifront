CREATE TABLE "marketplace"."agronomic_standards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"crop_type" text NOT NULL,
	"variety_type" text,
	"nitrogen_needs" double precision,
	"phosphorus_needs" double precision,
	"potassium_needs" double precision,
	"base_temperature" double precision,
	"gdd_to_harvest" integer,
	"min_humidity_threshold" double precision,
	"max_wind_speed_treatment" double precision DEFAULT 19,
	"version" text
);
--> statement-breakpoint
CREATE TABLE "marketplace"."crop_growth_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"crop_cycle_id" uuid NOT NULL,
	"stage_code" integer NOT NULL,
	"observed_at" timestamp DEFAULT now(),
	"image_snapshot_url" text,
	"accumulated_gdd_at_stage" integer
);
--> statement-breakpoint
CREATE TABLE "marketplace"."crop_growth_stages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"crop_type" text NOT NULL,
	"stage_code" integer NOT NULL,
	"stage_name" text NOT NULL,
	"gdd_threshold" integer NOT NULL,
	"nitrogen_need_kgha" double precision DEFAULT 0,
	"water_need_mmday" double precision DEFAULT 0,
	"agronomic_advice" text,
	"version" text DEFAULT 'v1'
);
--> statement-breakpoint
CREATE TABLE "marketplace"."field_interventions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"crop_cycle_id" uuid NOT NULL,
	"type" text NOT NULL,
	"description" text,
	"input_used" text,
	"quantity" double precision,
	"unit" text,
	"cost_per_unit" double precision DEFAULT 0,
	"machinery_used" text,
	"fuel_consumption" double precision,
	"hours_worked" double precision,
	"observed_bbch_stage" integer,
	"performed_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketplace"."pest_disease_catalog" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"target_crops" text[] NOT NULL,
	"symptoms_description" text,
	"critical_stage_bbch" integer,
	"weather_triggers" jsonb,
	"treatment_threshold" text,
	"recommended_molecules" text[],
	"bio_solutions" text[],
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketplace"."sensor_data_summary" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"farm_id" uuid NOT NULL,
	"soil_moisture" double precision,
	"last_rainfall" double precision,
	"accumulated_gdd" integer,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "marketplace"."sensor_telemetry_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"farm_id" uuid NOT NULL,
	"soil_moisture" double precision,
	"temperature" double precision,
	"humidity" double precision,
	"solar_radiation" double precision,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketplace"."soil_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"farm_id" uuid NOT NULL,
	"clay_percentage" double precision,
	"sand_percentage" double precision,
	"silt_percentage" double precision,
	"organic_matter" double precision,
	"ph_value" double precision,
	"water_retention_capacity" double precision,
	"sampling_date" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "intelligence"."agent_context_memory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"farm_id" uuid,
	"crop_cycle_id" uuid,
	"context_key" text NOT NULL,
	"context_value" jsonb NOT NULL,
	"source" text DEFAULT 'AGENT' NOT NULL,
	"confidence" double precision,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "intelligence"."ai_recommendations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"crop_cycle_id" uuid,
	"farm_id" uuid,
	"user_id" uuid,
	"agent_name" text NOT NULL,
	"recommendation_type" text NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"confidence_score" double precision,
	"data_sources_used" jsonb,
	"priority" text DEFAULT 'MEDIUM' NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"applied_at" timestamp,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "intelligence"."weather_data_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"zone_id" uuid,
	"farm_id" uuid,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"record_date" timestamp NOT NULL,
	"temp_min" double precision,
	"temp_max" double precision,
	"temp_mean" double precision,
	"precipitation_mm" double precision,
	"humidity_percent" double precision,
	"wind_speed_kmh" double precision,
	"solar_radiation" double precision,
	"evapotranspiration" double precision,
	"gdd_contribution" double precision,
	"source" text DEFAULT 'OPEN_METEO' NOT NULL,
	"raw_payload" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "marketplace"."crop_cycles" ALTER COLUMN "expected_yield" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "marketplace"."crop_cycles" ADD COLUMN "variety" text;--> statement-breakpoint
ALTER TABLE "marketplace"."crop_cycles" ADD COLUMN "farming_method" text DEFAULT 'conventional';--> statement-breakpoint
ALTER TABLE "marketplace"."crop_cycles" ADD COLUMN "soil_type" text;--> statement-breakpoint
ALTER TABLE "marketplace"."crop_cycles" ADD COLUMN "last_intervention_date" timestamp;--> statement-breakpoint
ALTER TABLE "marketplace"."crop_growth_logs" ADD CONSTRAINT "crop_growth_logs_crop_cycle_id_crop_cycles_id_fk" FOREIGN KEY ("crop_cycle_id") REFERENCES "marketplace"."crop_cycles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace"."field_interventions" ADD CONSTRAINT "field_interventions_crop_cycle_id_crop_cycles_id_fk" FOREIGN KEY ("crop_cycle_id") REFERENCES "marketplace"."crop_cycles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace"."sensor_data_summary" ADD CONSTRAINT "sensor_data_summary_farm_id_farms_id_fk" FOREIGN KEY ("farm_id") REFERENCES "marketplace"."farms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace"."sensor_telemetry_history" ADD CONSTRAINT "sensor_telemetry_history_farm_id_farms_id_fk" FOREIGN KEY ("farm_id") REFERENCES "marketplace"."farms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace"."soil_profiles" ADD CONSTRAINT "soil_profiles_farm_id_farms_id_fk" FOREIGN KEY ("farm_id") REFERENCES "marketplace"."farms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "as_crop_variety_unique" ON "marketplace"."agronomic_standards" USING btree ("crop_type","variety_type");--> statement-breakpoint
CREATE INDEX "as_crop_type_idx" ON "marketplace"."agronomic_standards" USING btree ("crop_type");--> statement-breakpoint
CREATE INDEX "cgl_crop_cycle_idx" ON "marketplace"."crop_growth_logs" USING btree ("crop_cycle_id");--> statement-breakpoint
CREATE INDEX "cgl_observed_at_idx" ON "marketplace"."crop_growth_logs" USING btree ("observed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "cgs_crop_stage_unique" ON "marketplace"."crop_growth_stages" USING btree ("crop_type","stage_code");--> statement-breakpoint
CREATE INDEX "cgs_crop_type_idx" ON "marketplace"."crop_growth_stages" USING btree ("crop_type");--> statement-breakpoint
CREATE INDEX "fi_crop_cycle_idx" ON "marketplace"."field_interventions" USING btree ("crop_cycle_id");--> statement-breakpoint
CREATE INDEX "fi_performed_at_idx" ON "marketplace"."field_interventions" USING btree ("performed_at");--> statement-breakpoint
CREATE INDEX "fi_type_idx" ON "marketplace"."field_interventions" USING btree ("type");--> statement-breakpoint
CREATE INDEX "pdc_type_idx" ON "marketplace"."pest_disease_catalog" USING btree ("type");--> statement-breakpoint
CREATE INDEX "pdc_name_idx" ON "marketplace"."pest_disease_catalog" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "sds_farm_unique" ON "marketplace"."sensor_data_summary" USING btree ("farm_id");--> statement-breakpoint
CREATE INDEX "telemetry_farm_time_idx" ON "marketplace"."sensor_telemetry_history" USING btree ("farm_id","timestamp");--> statement-breakpoint
CREATE INDEX "sp_farm_idx" ON "marketplace"."soil_profiles" USING btree ("farm_id");--> statement-breakpoint
CREATE INDEX "sp_sampling_date_idx" ON "marketplace"."soil_profiles" USING btree ("sampling_date");--> statement-breakpoint
CREATE INDEX "acm_user_idx" ON "intelligence"."agent_context_memory" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "acm_farm_idx" ON "intelligence"."agent_context_memory" USING btree ("farm_id");--> statement-breakpoint
CREATE INDEX "acm_key_idx" ON "intelligence"."agent_context_memory" USING btree ("context_key");--> statement-breakpoint
CREATE UNIQUE INDEX "acm_user_farm_key_unique" ON "intelligence"."agent_context_memory" USING btree ("user_id","farm_id","context_key");--> statement-breakpoint
CREATE INDEX "ai_rec_farm_idx" ON "intelligence"."ai_recommendations" USING btree ("farm_id");--> statement-breakpoint
CREATE INDEX "ai_rec_crop_cycle_idx" ON "intelligence"."ai_recommendations" USING btree ("crop_cycle_id");--> statement-breakpoint
CREATE INDEX "ai_rec_user_idx" ON "intelligence"."ai_recommendations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ai_rec_type_idx" ON "intelligence"."ai_recommendations" USING btree ("recommendation_type");--> statement-breakpoint
CREATE INDEX "ai_rec_status_idx" ON "intelligence"."ai_recommendations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ai_rec_created_idx" ON "intelligence"."ai_recommendations" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "wdl_zone_idx" ON "intelligence"."weather_data_logs" USING btree ("zone_id");--> statement-breakpoint
CREATE INDEX "wdl_farm_idx" ON "intelligence"."weather_data_logs" USING btree ("farm_id");--> statement-breakpoint
CREATE INDEX "wdl_date_idx" ON "intelligence"."weather_data_logs" USING btree ("record_date");--> statement-breakpoint
CREATE UNIQUE INDEX "wdl_farm_date_source_unique" ON "intelligence"."weather_data_logs" USING btree ("farm_id","record_date","source");--> statement-breakpoint
ALTER TABLE "marketplace"."crop_cycles" ADD CONSTRAINT "crop_cycles_farm_id_farms_id_fk" FOREIGN KEY ("farm_id") REFERENCES "marketplace"."farms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "crop_cycles_status_idx" ON "marketplace"."crop_cycles" USING btree ("status");