CREATE TABLE "intelligence"."agent_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_name" text NOT NULL,
	"action_type" text NOT NULL,
	"batch_id" uuid,
	"payload" jsonb,
	"status" "intelligence"."agent_action_status" DEFAULT 'PENDING' NOT NULL,
	"priority" "intelligence"."validation_priority" DEFAULT 'MEDIUM' NOT NULL,
	"order_id" uuid,
	"user_id" uuid,
	"audit_trail_id" text,
	"ai_reasoning" text,
	"admin_notes" text,
	"validated_by_id" uuid,
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
CREATE TABLE "marketplace"."auctions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"buyer_id" uuid NOT NULL,
	"sub_category_id" uuid NOT NULL,
	"quantity" double precision NOT NULL,
	"unit" "unit" DEFAULT 'TONNE' NOT NULL,
	"max_price_per_unit" double precision NOT NULL,
	"deadline" timestamp NOT NULL,
	"status" "marketplace"."auction_status" DEFAULT 'OPEN' NOT NULL,
	"target_zone_id" uuid,
	"version" integer DEFAULT 0 NOT NULL,
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
	"is_winner" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
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
CREATE TABLE "marketplace"."crop_cycles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"farm_id" uuid NOT NULL,
	"crop_type" text NOT NULL,
	"area_size" double precision NOT NULL,
	"planted_at" timestamp NOT NULL,
	"expected_harvest_date" timestamp NOT NULL,
	"expected_yield" double precision NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketplace"."expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"farm_id" uuid NOT NULL,
	"label" text NOT NULL,
	"amount" double precision NOT NULL,
	"category" "marketplace"."expense_category" DEFAULT 'OTHER' NOT NULL,
	"date" timestamp DEFAULT now() NOT NULL
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
	"payment_method" "marketplace"."payment_method" DEFAULT 'CASH' NOT NULL,
	"payment_status" "marketplace"."payment_status" DEFAULT 'PENDING' NOT NULL,
	"city" text,
	"gps_lat" double precision,
	"gps_lng" double precision,
	"delivery_desc" text,
	"audio_url" text,
	"status" "marketplace"."order_status" DEFAULT 'PENDING' NOT NULL,
	"source" "marketplace"."order_source" DEFAULT 'APP' NOT NULL,
	"whatsapp_id" text,
	"total_amount" double precision NOT NULL,
	"is_agent_order" boolean DEFAULT false NOT NULL,
	"client_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketplace"."producers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"organization_id" uuid,
	"business_name" text,
	"status" "marketplace"."producer_status" DEFAULT 'PENDING' NOT NULL,
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
	"unit" "unit" DEFAULT 'KG' NOT NULL,
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
CREATE TABLE "marketplace"."stock_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stock_id" uuid NOT NULL,
	"type" "marketplace"."movement_type" NOT NULL,
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
	"unit" "unit" DEFAULT 'KG' NOT NULL,
	"type" "marketplace"."stock_type" DEFAULT 'HARVEST' NOT NULL,
	"verified_at" timestamp,
	"verified_by_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
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
CREATE TABLE "auth"."sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_token" text NOT NULL,
	"user_id" uuid NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "sessions_session_token_unique" UNIQUE("session_token")
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
	"role" "auth"."role" DEFAULT 'USER' NOT NULL,
	"zone_id" uuid,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_phone_unique" UNIQUE("phone")
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
	"type" "governance"."organization_type" NOT NULL,
	"tax_id" text,
	"description" text,
	"status" "governance"."org_status" DEFAULT 'PENDING' NOT NULL,
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
	"unit" "unit" DEFAULT 'KG' NOT NULL,
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
	"role" "governance"."org_role" DEFAULT 'FIELD_AGENT' NOT NULL,
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
CREATE INDEX "agent_actions_status_idx" ON "intelligence"."agent_actions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "agent_actions_batch_idx" ON "intelligence"."agent_actions" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "agent_actions_name_idx" ON "intelligence"."agent_actions" USING btree ("agent_name");--> statement-breakpoint
CREATE UNIQUE INDEX "agent_actions_order_unique" ON "intelligence"."agent_actions" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "agent_telemetry_user_idx" ON "intelligence"."agent_telemetry" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ai_rating_trust_idx" ON "intelligence"."ai_rating_reasonings" USING btree ("trust_score_id");--> statement-breakpoint
CREATE INDEX "ai_rating_agent_idx" ON "intelligence"."ai_rating_reasonings" USING btree ("agent_name");--> statement-breakpoint
CREATE INDEX "anomalies_zone_idx" ON "intelligence"."anomalies" USING btree ("zone_id");--> statement-breakpoint
CREATE INDEX "anomalies_resolved_idx" ON "intelligence"."anomalies" USING btree ("is_resolved");--> statement-breakpoint
CREATE INDEX "auctions_status_idx" ON "marketplace"."auctions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "auctions_zone_idx" ON "marketplace"."auctions" USING btree ("target_zone_id");--> statement-breakpoint
CREATE INDEX "auctions_deadline_idx" ON "marketplace"."auctions" USING btree ("deadline");--> statement-breakpoint
CREATE INDEX "audit_logs_actor_idx" ON "intelligence"."audit_logs" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "audit_logs_entity_idx" ON "intelligence"."audit_logs" USING btree ("entity_id");--> statement-breakpoint
CREATE INDEX "batches_stock_idx" ON "marketplace"."batches" USING btree ("stock_id");--> statement-breakpoint
CREATE INDEX "batches_org_idx" ON "marketplace"."batches" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "bids_auction_producer_unique" ON "marketplace"."bids" USING btree ("auction_id","producer_id");--> statement-breakpoint
CREATE INDEX "bids_auction_idx" ON "marketplace"."bids" USING btree ("auction_id");--> statement-breakpoint
CREATE INDEX "bids_producer_idx" ON "marketplace"."bids" USING btree ("producer_id");--> statement-breakpoint
CREATE INDEX "clients_phone_idx" ON "marketplace"."clients" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "clients_name_idx" ON "marketplace"."clients" USING btree ("name");--> statement-breakpoint
CREATE INDEX "clients_producer_idx" ON "marketplace"."clients" USING btree ("producer_id");--> statement-breakpoint
CREATE INDEX "conversations_user_idx" ON "intelligence"."conversations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "conversations_agent_idx" ON "intelligence"."conversations" USING btree ("agent_type");--> statement-breakpoint
CREATE INDEX "conversations_created_idx" ON "intelligence"."conversations" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "conversations_audit_unique" ON "intelligence"."conversations" USING btree ("audit_trail_id");--> statement-breakpoint
CREATE INDEX "crop_cycles_farm_idx" ON "marketplace"."crop_cycles" USING btree ("farm_id");--> statement-breakpoint
CREATE INDEX "expenses_farm_idx" ON "marketplace"."expenses" USING btree ("farm_id");--> statement-breakpoint
CREATE INDEX "expenses_category_idx" ON "marketplace"."expenses" USING btree ("category");--> statement-breakpoint
CREATE INDEX "expenses_date_idx" ON "marketplace"."expenses" USING btree ("date");--> statement-breakpoint
CREATE INDEX "farms_producer_idx" ON "marketplace"."farms" USING btree ("producer_id");--> statement-breakpoint
CREATE INDEX "farms_zone_idx" ON "marketplace"."farms" USING btree ("zone_id");--> statement-breakpoint
CREATE INDEX "order_items_order_idx" ON "marketplace"."order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_items_product_idx" ON "marketplace"."order_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "orders_buyer_idx" ON "marketplace"."orders" USING btree ("buyer_id");--> statement-breakpoint
CREATE INDEX "orders_org_idx" ON "marketplace"."orders" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "marketplace"."orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "orders_zone_idx" ON "marketplace"."orders" USING btree ("zone_id");--> statement-breakpoint
CREATE INDEX "orders_created_idx" ON "marketplace"."orders" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "orders_phone_idx" ON "marketplace"."orders" USING btree ("customer_phone");--> statement-breakpoint
CREATE INDEX "producers_status_idx" ON "marketplace"."producers" USING btree ("status");--> statement-breakpoint
CREATE INDEX "producers_org_idx" ON "marketplace"."producers" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "producers_zone_idx" ON "marketplace"."producers" USING btree ("zone_id");--> statement-breakpoint
CREATE INDEX "products_producer_idx" ON "marketplace"."products" USING btree ("producer_id");--> statement-breakpoint
CREATE INDEX "products_category_idx" ON "marketplace"."products" USING btree ("category_label");--> statement-breakpoint
CREATE INDEX "products_subcategory_idx" ON "marketplace"."products" USING btree ("sub_category_id");--> statement-breakpoint
CREATE INDEX "products_price_idx" ON "marketplace"."products" USING btree ("price");--> statement-breakpoint
CREATE INDEX "products_created_idx" ON "marketplace"."products" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "products_verifier_idx" ON "marketplace"."products" USING btree ("verified_by_id");--> statement-breakpoint
CREATE INDEX "stock_movements_stock_idx" ON "marketplace"."stock_movements" USING btree ("stock_id");--> statement-breakpoint
CREATE INDEX "stock_movements_created_idx" ON "marketplace"."stock_movements" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "stocks_farm_idx" ON "marketplace"."stocks" USING btree ("farm_id");--> statement-breakpoint
CREATE INDEX "stocks_warehouse_idx" ON "marketplace"."stocks" USING btree ("warehouse_id");--> statement-breakpoint
CREATE INDEX "stocks_org_idx" ON "marketplace"."stocks" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "stocks_type_idx" ON "marketplace"."stocks" USING btree ("type");--> statement-breakpoint
CREATE INDEX "stocks_verifier_idx" ON "marketplace"."stocks" USING btree ("verified_by_id");--> statement-breakpoint
CREATE INDEX "territory_events_zone_idx" ON "intelligence"."territory_events" USING btree ("zone_id");--> statement-breakpoint
CREATE INDEX "territory_events_type_idx" ON "intelligence"."territory_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "warehouses_zone_idx" ON "marketplace"."warehouses" USING btree ("zone_id");--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_provider_unique" ON "auth"."accounts" USING btree ("provider","provider_account_id");--> statement-breakpoint
CREATE INDEX "accounts_user_idx" ON "auth"."accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "auth"."sessions" USING btree ("user_id");--> statement-breakpoint
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
CREATE INDEX "zones_path_idx" ON "governance"."zones" USING btree ("path");