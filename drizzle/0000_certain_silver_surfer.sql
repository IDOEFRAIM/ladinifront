CREATE TABLE "auth"."accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text
);
--> statement-breakpoint
CREATE TABLE "auth"."daily_advice_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"culture_name" text NOT NULL,
	"advice_content" text NOT NULL,
	"sent_at" timestamp DEFAULT now() NOT NULL,
	"is_useful" boolean
);
--> statement-breakpoint
CREATE TABLE "auth"."sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_token" text NOT NULL,
	"user_id" uuid NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "sessions_session_token_unique" UNIQUE("session_token")
);
--> statement-breakpoint
CREATE TABLE "auth"."user_cultures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"culture_name" text NOT NULL,
	"planting_date" timestamp NOT NULL,
	"is_association" boolean DEFAULT false,
	"status" text DEFAULT 'active'
);
--> statement-breakpoint
CREATE TABLE "auth"."users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text,
	"email" text,
	"email_verified" timestamp,
	"image" text,
	"password" text,
	"phone" text,
	"whatsapp_enabled" boolean DEFAULT true,
	"daily_advice_time" time DEFAULT '07:00',
	"latitude" double precision,
	"longitude" double precision,
	"cnib_number" text,
	"role" text DEFAULT 'USER' NOT NULL,
	"identity_verified" boolean DEFAULT false,
	"zone_id" uuid,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_phone_unique" UNIQUE("phone"),
	CONSTRAINT "users_cnib_number_unique" UNIQUE("cnib_number")
);
--> statement-breakpoint
CREATE TABLE "governance"."categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "governance"."climatic_regions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "climatic_regions_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "governance"."organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"tax_id" text,
	"description" text,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_tax_id_unique" UNIQUE("tax_id")
);
--> statement-breakpoint
CREATE TABLE "governance"."overlay_layers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"zone_id" uuid NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"settings" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "governance"."role_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"permissions" text[] DEFAULT '{}'::text[] NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "role_definitions_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "governance"."standard_prices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sub_category_id" uuid NOT NULL,
	"zone_id" uuid NOT NULL,
	"price_per_unit" double precision NOT NULL,
	"unit" text DEFAULT 'KG' NOT NULL,
	"updated_by_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "governance"."sub_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"name" text NOT NULL,
	"blocked_zone_ids" text[] DEFAULT '{}'::text[] NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "governance"."user_organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"role" text DEFAULT 'FIELD_AGENT' NOT NULL,
	"role_id" uuid,
	"managed_zone_id" uuid
);
--> statement-breakpoint
CREATE TABLE "governance"."work_zones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"zone_id" uuid NOT NULL,
	"manager_id" uuid,
	"role" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "governance"."zone_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"zone_id" uuid NOT NULL,
	"date" timestamp DEFAULT now() NOT NULL,
	"metric_name" text NOT NULL,
	"value" double precision NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "governance"."zone_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"zone_id" uuid NOT NULL,
	"key" text NOT NULL,
	"value" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "governance"."zones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"climatic_region_id" uuid NOT NULL,
	"organization_id" uuid,
	"parent_id" uuid,
	"path" text,
	"depth" integer DEFAULT 0 NOT NULL,
	"latitude" double precision,
	"longitude" double precision,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "zones_name_unique" UNIQUE("name"),
	CONSTRAINT "zones_code_unique" UNIQUE("code")
);
--> statement-breakpoint
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
CREATE TABLE "marketplace"."auctions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"buyer_id" uuid NOT NULL,
	"sub_category_id" uuid NOT NULL,
	"description" text,
	"quantity" double precision NOT NULL,
	"unit" text DEFAULT 'TONNE' NOT NULL,
	"max_price_per_unit" double precision NOT NULL,
	"deadline" timestamp NOT NULL,
	"auto_extend" boolean DEFAULT true NOT NULL,
	"escrow_status" text DEFAULT 'NONE' NOT NULL,
	"status" text DEFAULT 'OPEN' NOT NULL,
	"winner_bid_id" uuid,
	"awarded_at" timestamp,
	"cancelled_at" timestamp,
	"cancellation_reason" text,
	"target_zone_id" uuid,
	"version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketplace"."batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stock_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"batch_number" text NOT NULL,
	"origin_farm_id" uuid,
	"quantity" double precision NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "batches_batch_number_unique" UNIQUE("batch_number")
);
--> statement-breakpoint
CREATE TABLE "marketplace"."bids" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auction_id" uuid NOT NULL,
	"producer_id" uuid NOT NULL,
	"offered_price" double precision NOT NULL,
	"linked_stock_id" uuid,
	"is_winner" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"message" text,
	"notified_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketplace"."buyer_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"buyer_type_id" uuid,
	"establishment_name" text,
	"default_delivery_address" text,
	"is_verified" boolean DEFAULT false NOT NULL,
	"trust_badge" text,
	"verified_at" timestamp,
	"verified_by_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "buyer_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "marketplace"."buyer_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "buyer_types_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "marketplace"."clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"location" text,
	"total_orders" integer DEFAULT 0 NOT NULL,
	"total_spent" double precision DEFAULT 0 NOT NULL,
	"last_order_date" timestamp,
	"producer_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketplace"."crop_cycles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"farm_id" uuid NOT NULL,
	"crop_type" text NOT NULL,
	"area_size" double precision NOT NULL,
	"planted_at" timestamp NOT NULL,
	"expected_harvest_date" timestamp NOT NULL,
	"target_yield" double precision,
	"expected_yield" double precision,
	"status" text NOT NULL,
	"variety" text,
	"farming_method" text DEFAULT 'conventional',
	"soil_type" text,
	"last_intervention_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
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
CREATE TABLE "marketplace"."deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"delivery_agent_id" uuid,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"delivery_code" text,
	"origin_gps_lat" double precision,
	"origin_gps_lng" double precision,
	"destination_gps_lat" double precision,
	"destination_gps_lng" double precision,
	"destination_desc" text,
	"estimated_distance_km" double precision,
	"assigned_at" timestamp,
	"picked_up_at" timestamp,
	"delivered_at" timestamp,
	"failed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketplace"."delivery_agents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"vehicle_type" text,
	"license_number" text,
	"zone_id" uuid,
	"status" text DEFAULT 'OFFLINE' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "delivery_agents_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "marketplace"."expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"farm_id" uuid NOT NULL,
	"label" text NOT NULL,
	"amount" double precision NOT NULL,
	"category" text DEFAULT 'OTHER' NOT NULL,
	"date" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketplace"."farms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"location" text,
	"size" double precision,
	"soil_type" text,
	"water_source" text,
	"zone_id" uuid,
	"producer_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
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
CREATE TABLE "marketplace"."order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity" double precision NOT NULL,
	"price_at_sale" double precision NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketplace"."orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"buyer_id" uuid,
	"organization_id" uuid,
	"customer_name" text,
	"customer_phone" text,
	"zone_id" uuid,
	"payment_method" text DEFAULT 'CASH' NOT NULL,
	"payment_status" text DEFAULT 'PENDING' NOT NULL,
	"city" text,
	"gps_lat" double precision,
	"gps_lng" double precision,
	"delivery_desc" text,
	"audio_url" text,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"delivery_status" text DEFAULT 'PENDING' NOT NULL,
	"source" text DEFAULT 'APP' NOT NULL,
	"whatsapp_id" text,
	"total_amount" double precision NOT NULL,
	"is_agent_order" boolean DEFAULT false NOT NULL,
	"client_id" uuid,
	"auction_id" uuid,
	"winning_bid_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
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
CREATE TABLE "marketplace"."producers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"organization_id" uuid,
	"business_name" text,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"is_certified" boolean DEFAULT false NOT NULL,
	"zone_id" uuid,
	"region" text,
	"province" text,
	"commune" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "producers_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "marketplace"."products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"short_code" text,
	"name" text DEFAULT 'Produit' NOT NULL,
	"category_label" text NOT NULL,
	"sub_category_id" uuid,
	"local_names" jsonb,
	"description" text,
	"price" double precision NOT NULL,
	"unit" text DEFAULT 'KG' NOT NULL,
	"quantity_for_sale" double precision DEFAULT 0 NOT NULL,
	"images" text[] DEFAULT '{}'::text[] NOT NULL,
	"audio_url" text,
	"producer_id" uuid NOT NULL,
	"verified_at" timestamp,
	"verified_by_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "products_short_code_unique" UNIQUE("short_code")
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
CREATE TABLE "marketplace"."stock_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stock_id" uuid NOT NULL,
	"type" text NOT NULL,
	"quantity" double precision NOT NULL,
	"reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketplace"."stocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"farm_id" uuid,
	"warehouse_id" uuid,
	"organization_id" uuid,
	"item_name" text NOT NULL,
	"quantity" double precision DEFAULT 0 NOT NULL,
	"unit" text DEFAULT 'KG' NOT NULL,
	"type" text DEFAULT 'HARVEST' NOT NULL,
	"verified_at" timestamp,
	"verified_by_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketplace"."warehouses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"capacity" double precision,
	"location" text,
	"zone_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "intelligence"."agent_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_name" text NOT NULL,
	"action_type" text NOT NULL,
	"batch_id" text,
	"payload" jsonb,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"priority" text DEFAULT 'MEDIUM' NOT NULL,
	"order_id" uuid,
	"user_id" uuid,
	"audit_trail_id" text,
	"ai_reasoning" text,
	"admin_notes" text,
	"validated_by_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
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
CREATE TABLE "intelligence"."agent_telemetry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"latitude" double precision,
	"longitude" double precision,
	"battery" integer,
	"signal" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "intelligence"."ai_rating_reasonings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trust_score_id" uuid NOT NULL,
	"agent_name" text NOT NULL,
	"justification" text NOT NULL,
	"data_points" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
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
CREATE TABLE "intelligence"."anomalies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"zone_id" uuid NOT NULL,
	"source" text,
	"level" text NOT NULL,
	"title" text NOT NULL,
	"message" text,
	"details" jsonb,
	"is_resolved" boolean DEFAULT false NOT NULL,
	"resolved_by_id" uuid,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "intelligence"."audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid NOT NULL,
	"action" text NOT NULL,
	"entity_id" text NOT NULL,
	"entity_type" text NOT NULL,
	"old_value" jsonb,
	"new_value" jsonb,
	"ip_address" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "intelligence"."conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"query" text NOT NULL,
	"response" text,
	"agent_type" text,
	"crop" text,
	"zone_id" uuid,
	"mode" text DEFAULT 'text' NOT NULL,
	"audio_url" text,
	"is_waiting_for_input" boolean DEFAULT false NOT NULL,
	"missing_slots" jsonb,
	"execution_path" jsonb,
	"confidence_score" double precision,
	"total_tokens_used" integer DEFAULT 0 NOT NULL,
	"response_time_ms" integer,
	"audit_trail_id" text,
	"anomaly_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "intelligence"."external_context_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"file_name" text NOT NULL,
	"file_type" text NOT NULL,
	"file_url" text NOT NULL,
	"category" text,
	"zone_id" uuid,
	"is_vectorized" boolean DEFAULT false NOT NULL,
	"mcp_server_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "intelligence"."territory_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"zone_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"payload" jsonb,
	"meta" jsonb,
	"status" text DEFAULT 'NEW' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"processed_at" timestamp,
	"processed_by_id" uuid
);
--> statement-breakpoint
CREATE TABLE "intelligence"."trust_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"global_score" double precision DEFAULT 0 NOT NULL,
	"reliability_index" double precision DEFAULT 0 NOT NULL,
	"quality_index" double precision DEFAULT 0 NOT NULL,
	"compliance_index" double precision DEFAULT 0 NOT NULL,
	"resilience_bonus" double precision DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "trust_scores_user_id_unique" UNIQUE("user_id")
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
CREATE TABLE "marketplace"."seed_allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"zone_id" uuid NOT NULL,
	"seed_type" text NOT NULL,
	"total_quantity" integer NOT NULL,
	"remaining_quantity" integer NOT NULL,
	"unit" text DEFAULT 'KG' NOT NULL,
	"allocated_by_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketplace"."seed_distribution_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"distribution_id" uuid NOT NULL,
	"actor_id" uuid,
	"attempt_type" text,
	"success" boolean DEFAULT false NOT NULL,
	"ip_address" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketplace"."seed_distributions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"allocation_id" uuid NOT NULL,
	"producer_id" uuid NOT NULL,
	"agent_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"zone_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"cnib_provided" text,
	"verification_code_hash" text,
	"verification_code_expires_at" timestamp,
	"verification_channel" text DEFAULT 'IN_APP',
	"attempts_count" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"receipt_at" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "auth"."daily_advice_logs" ADD CONSTRAINT "daily_advice_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth"."user_cultures" ADD CONSTRAINT "user_cultures_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace"."crop_cycles" ADD CONSTRAINT "crop_cycles_farm_id_farms_id_fk" FOREIGN KEY ("farm_id") REFERENCES "marketplace"."farms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace"."crop_growth_logs" ADD CONSTRAINT "crop_growth_logs_crop_cycle_id_crop_cycles_id_fk" FOREIGN KEY ("crop_cycle_id") REFERENCES "marketplace"."crop_cycles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace"."farms" ADD CONSTRAINT "farms_zone_id_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "governance"."zones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace"."farms" ADD CONSTRAINT "farms_producer_id_producers_id_fk" FOREIGN KEY ("producer_id") REFERENCES "marketplace"."producers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace"."field_interventions" ADD CONSTRAINT "field_interventions_crop_cycle_id_crop_cycles_id_fk" FOREIGN KEY ("crop_cycle_id") REFERENCES "marketplace"."crop_cycles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace"."sensor_data_summary" ADD CONSTRAINT "sensor_data_summary_farm_id_farms_id_fk" FOREIGN KEY ("farm_id") REFERENCES "marketplace"."farms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace"."sensor_telemetry_history" ADD CONSTRAINT "sensor_telemetry_history_farm_id_farms_id_fk" FOREIGN KEY ("farm_id") REFERENCES "marketplace"."farms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace"."soil_profiles" ADD CONSTRAINT "soil_profiles_farm_id_farms_id_fk" FOREIGN KEY ("farm_id") REFERENCES "marketplace"."farms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_provider_unique" ON "auth"."accounts" USING btree ("provider","provider_account_id");--> statement-breakpoint
CREATE INDEX "accounts_user_idx" ON "auth"."accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "auth"."sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_cultures_user_idx" ON "auth"."user_cultures" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "auth"."users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "users_zone_idx" ON "auth"."users" USING btree ("zone_id");--> statement-breakpoint
CREATE INDEX "users_created_idx" ON "auth"."users" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "overlay_layers_zone_key_unique" ON "governance"."overlay_layers" USING btree ("zone_id","key");--> statement-breakpoint
CREATE INDEX "overlay_layers_zone_idx" ON "governance"."overlay_layers" USING btree ("zone_id");--> statement-breakpoint
CREATE UNIQUE INDEX "standard_prices_sub_zone_unique" ON "governance"."standard_prices" USING btree ("sub_category_id","zone_id");--> statement-breakpoint
CREATE INDEX "standard_prices_zone_idx" ON "governance"."standard_prices" USING btree ("zone_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sub_categories_cat_name_unique" ON "governance"."sub_categories" USING btree ("category_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "user_org_unique" ON "governance"."user_organizations" USING btree ("user_id","organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "work_zones_org_zone_unique" ON "governance"."work_zones" USING btree ("organization_id","zone_id");--> statement-breakpoint
CREATE INDEX "work_zones_org_idx" ON "governance"."work_zones" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "work_zones_zone_idx" ON "governance"."work_zones" USING btree ("zone_id");--> statement-breakpoint
CREATE INDEX "zone_metrics_composite_idx" ON "governance"."zone_metrics" USING btree ("zone_id","date","metric_name");--> statement-breakpoint
CREATE UNIQUE INDEX "zone_settings_zone_key_unique" ON "governance"."zone_settings" USING btree ("zone_id","key");--> statement-breakpoint
CREATE INDEX "zone_settings_zone_idx" ON "governance"."zone_settings" USING btree ("zone_id");--> statement-breakpoint
CREATE INDEX "zones_region_idx" ON "governance"."zones" USING btree ("climatic_region_id");--> statement-breakpoint
CREATE INDEX "zones_org_idx" ON "governance"."zones" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "zones_active_idx" ON "governance"."zones" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "zones_parent_idx" ON "governance"."zones" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "zones_path_idx" ON "governance"."zones" USING btree ("path");--> statement-breakpoint
CREATE UNIQUE INDEX "as_crop_variety_unique" ON "marketplace"."agronomic_standards" USING btree ("crop_type","variety_type");--> statement-breakpoint
CREATE INDEX "as_crop_type_idx" ON "marketplace"."agronomic_standards" USING btree ("crop_type");--> statement-breakpoint
CREATE INDEX "auctions_status_idx" ON "marketplace"."auctions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "auctions_buyer_idx" ON "marketplace"."auctions" USING btree ("buyer_id");--> statement-breakpoint
CREATE INDEX "auctions_escrow_status_idx" ON "marketplace"."auctions" USING btree ("escrow_status");--> statement-breakpoint
CREATE INDEX "auctions_zone_idx" ON "marketplace"."auctions" USING btree ("target_zone_id");--> statement-breakpoint
CREATE INDEX "auctions_deadline_idx" ON "marketplace"."auctions" USING btree ("deadline");--> statement-breakpoint
CREATE INDEX "batches_stock_idx" ON "marketplace"."batches" USING btree ("stock_id");--> statement-breakpoint
CREATE INDEX "batches_org_idx" ON "marketplace"."batches" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "bids_auction_producer_unique" ON "marketplace"."bids" USING btree ("auction_id","producer_id");--> statement-breakpoint
CREATE INDEX "bids_auction_idx" ON "marketplace"."bids" USING btree ("auction_id");--> statement-breakpoint
CREATE INDEX "bids_producer_idx" ON "marketplace"."bids" USING btree ("producer_id");--> statement-breakpoint
CREATE INDEX "bids_linked_stock_idx" ON "marketplace"."bids" USING btree ("linked_stock_id");--> statement-breakpoint
CREATE INDEX "bids_status_idx" ON "marketplace"."bids" USING btree ("status");--> statement-breakpoint
CREATE INDEX "buyer_profiles_user_idx" ON "marketplace"."buyer_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "buyer_profiles_type_idx" ON "marketplace"."buyer_profiles" USING btree ("buyer_type_id");--> statement-breakpoint
CREATE INDEX "buyer_profiles_verified_idx" ON "marketplace"."buyer_profiles" USING btree ("is_verified");--> statement-breakpoint
CREATE INDEX "clients_phone_idx" ON "marketplace"."clients" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "clients_name_idx" ON "marketplace"."clients" USING btree ("name");--> statement-breakpoint
CREATE INDEX "clients_producer_idx" ON "marketplace"."clients" USING btree ("producer_id");--> statement-breakpoint
CREATE INDEX "crop_cycles_farm_idx" ON "marketplace"."crop_cycles" USING btree ("farm_id");--> statement-breakpoint
CREATE INDEX "crop_cycles_status_idx" ON "marketplace"."crop_cycles" USING btree ("status");--> statement-breakpoint
CREATE INDEX "cgl_crop_cycle_idx" ON "marketplace"."crop_growth_logs" USING btree ("crop_cycle_id");--> statement-breakpoint
CREATE INDEX "cgl_observed_at_idx" ON "marketplace"."crop_growth_logs" USING btree ("observed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "cgs_crop_stage_unique" ON "marketplace"."crop_growth_stages" USING btree ("crop_type","stage_code");--> statement-breakpoint
CREATE INDEX "cgs_crop_type_idx" ON "marketplace"."crop_growth_stages" USING btree ("crop_type");--> statement-breakpoint
CREATE UNIQUE INDEX "deliveries_order_unique" ON "marketplace"."deliveries" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "deliveries_agent_idx" ON "marketplace"."deliveries" USING btree ("delivery_agent_id");--> statement-breakpoint
CREATE INDEX "deliveries_status_idx" ON "marketplace"."deliveries" USING btree ("status");--> statement-breakpoint
CREATE INDEX "delivery_agents_zone_idx" ON "marketplace"."delivery_agents" USING btree ("zone_id");--> statement-breakpoint
CREATE INDEX "delivery_agents_status_idx" ON "marketplace"."delivery_agents" USING btree ("status");--> statement-breakpoint
CREATE INDEX "expenses_farm_idx" ON "marketplace"."expenses" USING btree ("farm_id");--> statement-breakpoint
CREATE INDEX "expenses_category_idx" ON "marketplace"."expenses" USING btree ("category");--> statement-breakpoint
CREATE INDEX "expenses_date_idx" ON "marketplace"."expenses" USING btree ("date");--> statement-breakpoint
CREATE INDEX "farms_producer_idx" ON "marketplace"."farms" USING btree ("producer_id");--> statement-breakpoint
CREATE INDEX "farms_zone_idx" ON "marketplace"."farms" USING btree ("zone_id");--> statement-breakpoint
CREATE INDEX "fi_crop_cycle_idx" ON "marketplace"."field_interventions" USING btree ("crop_cycle_id");--> statement-breakpoint
CREATE INDEX "fi_performed_at_idx" ON "marketplace"."field_interventions" USING btree ("performed_at");--> statement-breakpoint
CREATE INDEX "fi_type_idx" ON "marketplace"."field_interventions" USING btree ("type");--> statement-breakpoint
CREATE INDEX "order_items_order_idx" ON "marketplace"."order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_items_product_idx" ON "marketplace"."order_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "orders_buyer_idx" ON "marketplace"."orders" USING btree ("buyer_id");--> statement-breakpoint
CREATE INDEX "orders_org_idx" ON "marketplace"."orders" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "marketplace"."orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "orders_delivery_status_idx" ON "marketplace"."orders" USING btree ("delivery_status");--> statement-breakpoint
CREATE INDEX "orders_zone_idx" ON "marketplace"."orders" USING btree ("zone_id");--> statement-breakpoint
CREATE INDEX "orders_created_idx" ON "marketplace"."orders" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "orders_phone_idx" ON "marketplace"."orders" USING btree ("customer_phone");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_auction_unique" ON "marketplace"."orders" USING btree ("auction_id");--> statement-breakpoint
CREATE INDEX "orders_winning_bid_idx" ON "marketplace"."orders" USING btree ("winning_bid_id");--> statement-breakpoint
CREATE INDEX "pdc_type_idx" ON "marketplace"."pest_disease_catalog" USING btree ("type");--> statement-breakpoint
CREATE INDEX "pdc_name_idx" ON "marketplace"."pest_disease_catalog" USING btree ("name");--> statement-breakpoint
CREATE INDEX "producers_status_idx" ON "marketplace"."producers" USING btree ("status");--> statement-breakpoint
CREATE INDEX "producers_org_idx" ON "marketplace"."producers" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "producers_zone_idx" ON "marketplace"."producers" USING btree ("zone_id");--> statement-breakpoint
CREATE INDEX "products_producer_idx" ON "marketplace"."products" USING btree ("producer_id");--> statement-breakpoint
CREATE INDEX "products_category_idx" ON "marketplace"."products" USING btree ("category_label");--> statement-breakpoint
CREATE INDEX "products_subcategory_idx" ON "marketplace"."products" USING btree ("sub_category_id");--> statement-breakpoint
CREATE INDEX "products_price_idx" ON "marketplace"."products" USING btree ("price");--> statement-breakpoint
CREATE INDEX "products_created_idx" ON "marketplace"."products" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "products_verifier_idx" ON "marketplace"."products" USING btree ("verified_by_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sds_farm_unique" ON "marketplace"."sensor_data_summary" USING btree ("farm_id");--> statement-breakpoint
CREATE INDEX "telemetry_farm_time_idx" ON "marketplace"."sensor_telemetry_history" USING btree ("farm_id","timestamp");--> statement-breakpoint
CREATE INDEX "sp_farm_idx" ON "marketplace"."soil_profiles" USING btree ("farm_id");--> statement-breakpoint
CREATE INDEX "sp_sampling_date_idx" ON "marketplace"."soil_profiles" USING btree ("sampling_date");--> statement-breakpoint
CREATE INDEX "stock_movements_stock_idx" ON "marketplace"."stock_movements" USING btree ("stock_id");--> statement-breakpoint
CREATE INDEX "stock_movements_created_idx" ON "marketplace"."stock_movements" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "stocks_farm_idx" ON "marketplace"."stocks" USING btree ("farm_id");--> statement-breakpoint
CREATE INDEX "stocks_warehouse_idx" ON "marketplace"."stocks" USING btree ("warehouse_id");--> statement-breakpoint
CREATE INDEX "stocks_org_idx" ON "marketplace"."stocks" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "stocks_type_idx" ON "marketplace"."stocks" USING btree ("type");--> statement-breakpoint
CREATE INDEX "stocks_verifier_idx" ON "marketplace"."stocks" USING btree ("verified_by_id");--> statement-breakpoint
CREATE INDEX "warehouses_zone_idx" ON "marketplace"."warehouses" USING btree ("zone_id");--> statement-breakpoint
CREATE INDEX "agent_actions_status_idx" ON "intelligence"."agent_actions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "agent_actions_batch_idx" ON "intelligence"."agent_actions" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "agent_actions_name_idx" ON "intelligence"."agent_actions" USING btree ("agent_name");--> statement-breakpoint
CREATE UNIQUE INDEX "agent_actions_order_unique" ON "intelligence"."agent_actions" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "acm_user_idx" ON "intelligence"."agent_context_memory" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "acm_farm_idx" ON "intelligence"."agent_context_memory" USING btree ("farm_id");--> statement-breakpoint
CREATE INDEX "acm_key_idx" ON "intelligence"."agent_context_memory" USING btree ("context_key");--> statement-breakpoint
CREATE UNIQUE INDEX "acm_user_farm_key_unique" ON "intelligence"."agent_context_memory" USING btree ("user_id","farm_id","context_key");--> statement-breakpoint
CREATE INDEX "agent_telemetry_user_idx" ON "intelligence"."agent_telemetry" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ai_rating_trust_idx" ON "intelligence"."ai_rating_reasonings" USING btree ("trust_score_id");--> statement-breakpoint
CREATE INDEX "ai_rating_agent_idx" ON "intelligence"."ai_rating_reasonings" USING btree ("agent_name");--> statement-breakpoint
CREATE INDEX "ai_rec_farm_idx" ON "intelligence"."ai_recommendations" USING btree ("farm_id");--> statement-breakpoint
CREATE INDEX "ai_rec_crop_cycle_idx" ON "intelligence"."ai_recommendations" USING btree ("crop_cycle_id");--> statement-breakpoint
CREATE INDEX "ai_rec_user_idx" ON "intelligence"."ai_recommendations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ai_rec_type_idx" ON "intelligence"."ai_recommendations" USING btree ("recommendation_type");--> statement-breakpoint
CREATE INDEX "ai_rec_status_idx" ON "intelligence"."ai_recommendations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ai_rec_created_idx" ON "intelligence"."ai_recommendations" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "anomalies_zone_idx" ON "intelligence"."anomalies" USING btree ("zone_id");--> statement-breakpoint
CREATE INDEX "anomalies_resolved_idx" ON "intelligence"."anomalies" USING btree ("is_resolved");--> statement-breakpoint
CREATE INDEX "audit_logs_actor_idx" ON "intelligence"."audit_logs" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "audit_logs_entity_idx" ON "intelligence"."audit_logs" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "conversations_user_idx" ON "intelligence"."conversations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "conversations_agent_idx" ON "intelligence"."conversations" USING btree ("agent_type");--> statement-breakpoint
CREATE INDEX "conversations_created_idx" ON "intelligence"."conversations" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "conversations_audit_unique" ON "intelligence"."conversations" USING btree ("audit_trail_id");--> statement-breakpoint
CREATE INDEX "territory_events_zone_idx" ON "intelligence"."territory_events" USING btree ("zone_id");--> statement-breakpoint
CREATE INDEX "territory_events_type_idx" ON "intelligence"."territory_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "wdl_zone_idx" ON "intelligence"."weather_data_logs" USING btree ("zone_id");--> statement-breakpoint
CREATE INDEX "wdl_farm_idx" ON "intelligence"."weather_data_logs" USING btree ("farm_id");--> statement-breakpoint
CREATE INDEX "wdl_date_idx" ON "intelligence"."weather_data_logs" USING btree ("record_date");--> statement-breakpoint
CREATE UNIQUE INDEX "wdl_farm_date_source_unique" ON "intelligence"."weather_data_logs" USING btree ("farm_id","record_date","source");--> statement-breakpoint
CREATE INDEX "seed_allocations_org_idx" ON "marketplace"."seed_allocations" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "seed_allocations_zone_idx" ON "marketplace"."seed_allocations" USING btree ("zone_id");--> statement-breakpoint
CREATE INDEX "seed_allocations_seedtype_idx" ON "marketplace"."seed_allocations" USING btree ("seed_type");--> statement-breakpoint
CREATE INDEX "sda_distribution_idx" ON "marketplace"."seed_distribution_attempts" USING btree ("distribution_id");--> statement-breakpoint
CREATE INDEX "sda_actor_idx" ON "marketplace"."seed_distribution_attempts" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "seed_distributions_alloc_idx" ON "marketplace"."seed_distributions" USING btree ("allocation_id");--> statement-breakpoint
CREATE INDEX "seed_distributions_producer_idx" ON "marketplace"."seed_distributions" USING btree ("producer_id");--> statement-breakpoint
CREATE INDEX "seed_distributions_agent_idx" ON "marketplace"."seed_distributions" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "seed_distributions_status_idx" ON "marketplace"."seed_distributions" USING btree ("status");