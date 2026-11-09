CREATE SCHEMA "advisor";
--> statement-breakpoint
CREATE TABLE "advisor"."catalog_entries" (
	"kind" text NOT NULL,
	"id" text NOT NULL,
	"label" text NOT NULL,
	"aliases" text[] DEFAULT '{}'::text[] NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "catalog_entries_pk" PRIMARY KEY("kind","id")
);
--> statement-breakpoint
CREATE TABLE "advisor"."knowledge_items" (
	"id" text NOT NULL,
	"version" text NOT NULL,
	"kind" text NOT NULL,
	"entry_id" text NOT NULL,
	"zone" text,
	"source_id" text NOT NULL,
	"source_name" text NOT NULL,
	"review" jsonb,
	"payload" jsonb NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"origin" text,
	"imported_by" text,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "knowledge_items_pk" PRIMARY KEY("id","version"),
	CONSTRAINT "knowledge_items_status_chk" CHECK ("advisor"."knowledge_items"."status" IN ('ACTIVE', 'SUPERSEDED', 'RETIRED'))
);
--> statement-breakpoint
CREATE TABLE "advisor"."knowledge_passages" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"source_id" text NOT NULL,
	"locator" text NOT NULL,
	"subjects" text[] DEFAULT '{}'::text[] NOT NULL,
	"topic" text,
	"content" text NOT NULL,
	"search" "tsvector" GENERATED ALWAYS AS (to_tsvector('french'::regconfig, coalesce("advisor"."knowledge_passages"."topic", '') || ' ' || "advisor"."knowledge_passages"."content")) STORED,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "knowledge_passages_source_locator_uq" UNIQUE("source_id","locator")
);
--> statement-breakpoint
CREATE TABLE "advisor"."knowledge_sources" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"publisher" text,
	"url" text,
	"published_on" date,
	"licence" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "advisor"."knowledge_passages" ADD CONSTRAINT "knowledge_passages_source_id_fk" FOREIGN KEY ("source_id") REFERENCES "advisor"."knowledge_sources"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "knowledge_items_one_active_uq" ON "advisor"."knowledge_items" USING btree ("id") WHERE "advisor"."knowledge_items"."status" = 'ACTIVE';--> statement-breakpoint
CREATE INDEX "knowledge_items_lookup_idx" ON "advisor"."knowledge_items" USING btree ("kind","entry_id") WHERE "advisor"."knowledge_items"."status" = 'ACTIVE';--> statement-breakpoint
CREATE INDEX "knowledge_passages_search_idx" ON "advisor"."knowledge_passages" USING gin ("search");--> statement-breakpoint
CREATE INDEX "knowledge_passages_subjects_idx" ON "advisor"."knowledge_passages" USING gin ("subjects");