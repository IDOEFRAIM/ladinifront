// Connaissances du conseiller (phase 1) : à ajouter au schéma Drizzle du dépôt frontend, puis `drizzle-kit generate`.
// SQL attendu : `0018_advisor_knowledge.sql` (même dossier). Le backend lit ces tables via `ladini.advisor.adapters.knowledge_db`.
//
// Règles :
//  * les fiches (`knowledge_items`) sont stockées TELLES QUE RELUES (bloc `review` + `payload`) : la validation (schéma, relecteur,
//    approbation signée Ed25519) est refaite par le conseiller à chaque chargement. Modifier une ligne en base casse l'empreinte signée :
//    la fiche redevient un brouillon, jamais une fiche approuvée ;
//  * une seule version ACTIVE par fiche (index unique partiel), l'historique reste (SUPERSEDED / RETIRED) ;
//  * `knowledge_passages` : passages de documents publics CITÉS (niveau B), cherchés en plein texte français.
import { sql } from "drizzle-orm";
import {
  bigserial, check, date, integer, foreignKey, index, jsonb, pgSchema, primaryKey, text, timestamp, unique, uniqueIndex, customType,
} from "drizzle-orm/pg-core";

export const advisor = pgSchema("advisor");

const tsvector = customType<{ data: string }>({ dataType: () => "tsvector" });

export const knowledgeSources = advisor.table("knowledge_sources", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  publisher: text("publisher"),
  url: text("url"),
  publishedOn: date("published_on"),
  licence: text("licence"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const catalogEntries = advisor.table("catalog_entries", {
  kind: text("kind").notNull(),
  id: text("id").notNull(),
  label: text("label").notNull(),
  aliases: text("aliases").array().default(sql`'{}'::text[]`).notNull(),
  position: integer("position").default(0).notNull(), // ordre de reconnaissance, celui du fichier d'origine
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [primaryKey({ name: "catalog_entries_pk", columns: [t.kind, t.id] })]);

export const knowledgeItems = advisor.table("knowledge_items", {
  id: text("id").notNull(),
  version: text("version").notNull(),
  kind: text("kind").notNull(),
  entryId: text("entry_id").notNull(),
  zone: text("zone"),
  sourceId: text("source_id").notNull(),
  sourceName: text("source_name").notNull(),
  review: jsonb("review"),
  payload: jsonb("payload").notNull(),
  status: text("status").default("ACTIVE").notNull(),
  origin: text("origin"),
  importedBy: text("imported_by"),
  importedAt: timestamp("imported_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  primaryKey({ name: "knowledge_items_pk", columns: [t.id, t.version] }),
  check("knowledge_items_status_chk", sql`${t.status} IN ('ACTIVE', 'SUPERSEDED', 'RETIRED')`),
  uniqueIndex("knowledge_items_one_active_uq").on(t.id).where(sql`${t.status} = 'ACTIVE'`),
  index("knowledge_items_lookup_idx").on(t.kind, t.entryId).where(sql`${t.status} = 'ACTIVE'`),
]);

export const knowledgePassages = advisor.table("knowledge_passages", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  sourceId: text("source_id").notNull(),
  locator: text("locator").notNull(),
  subjects: text("subjects").array().default(sql`'{}'::text[]`).notNull(),
  topic: text("topic"),
  content: text("content").notNull(),
  search: tsvector("search").generatedAlwaysAs(
    (): ReturnType<typeof sql> => sql`to_tsvector('french'::regconfig, coalesce(${knowledgePassages.topic}, '') || ' ' || ${knowledgePassages.content})`,
  ),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  unique("knowledge_passages_source_locator_uq").on(t.sourceId, t.locator),
  foreignKey({ name: "knowledge_passages_source_id_fk", columns: [t.sourceId], foreignColumns: [knowledgeSources.id] }).onDelete("restrict"),
  index("knowledge_passages_search_idx").using("gin", t.search),
  index("knowledge_passages_subjects_idx").using("gin", t.subjects),
]);
