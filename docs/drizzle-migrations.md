# Drizzle — source de vérité du schéma PostgreSQL

**Drizzle (`src/db/schema/*.ts`) est la SEULE définition du schéma PostgreSQL de Ladini.**
Le backend Python (SQLAlchemy) n'en est qu'un miroir vérifié automatiquement ; il ne crée ni ne modifie jamais rien.

```
src/db/schema/*.ts ──drizzle-kit generate──▶ drizzle/NNNN_*.sql + meta/  ──npm run db:migrate──▶ PostgreSQL
                                                     │
                                                     └─ copie synchronisée dans le backend : backend/schema_contract/
                                                        (tests : Drizzle == PostgreSQL == SQLAlchemy)
```

## Historique : baseline du 2026-09-21

L'ancien historique (`0000`…`0007`) reflétait des ajouts manuels, du DDL exécuté par le backend au démarrage et des
FK jamais créées : il a été remplacé par **un baseline unique `0000_baseline.sql`** (base vide → schéma complet).
Il crée aussi les schémas (`auth`, `governance`, `marketplace`, `intelligence`) et l'extension `pg_trgm`.
Une base construite avant ce baseline doit être **recréée** (elle n'a plus de journal de migration compatible).

## Flux de travail

1. Modifier `src/db/schema/*.ts` (une FK = `.references((): AnyPgColumn => table.col, { onDelete: '...' })`).
2. `npx drizzle-kit generate --name=<verbe_objet>` puis **relire le SQL** (aucun `DROP` non voulu).
3. `npm run db:schema-check` : le schéma TS et les migrations commitées doivent être identiques.
4. Appliquer sur une base jetable : `npm run db:migrate` (2 fois : la seconde doit être un no-op).
5. **Synchroniser le contrat backend** (dépôt `ladini`) :
   `python backend/tests/schema/sync_contract.py --frontend <chemin de ce dépôt>` puis mettre à jour le miroir
   SQLAlchemy (`domain/*/models.py`, `domain/runtime_tables.py`) jusqu'à ce que `pytest backend/tests/schema` soit vert.
6. Déployer : `npm run db:migrate` **avant** le nouveau code backend (expand → migrate → contract, voir
   `docs/runbooks/migrations.md` du dépôt backend).

## Règles de conception (validées par les tests du backend)

- Toute FK métier existe **dans PostgreSQL** avec un `ON DELETE` explicite : `cascade` (données purement dérivées :
  sessions, comptes, appartenances, scores), `set null` (références facultatives / audit), sinon `restrict`
  (données transactionnelles : commandes, paiements, enchères, offres, produits).
- Toute colonne FK est indexée (ou justifiée dans `FK_WITHOUT_INDEX_OK`, backend `tests/schema/`).
- Toute unicité critique (idempotence, références fournisseur, gagnant d'enchère) est une contrainte/index UNIQUE
  PostgreSQL — jamais seulement du code ou Redis.
- Les statuts sont des `text` (pas d'enum PG). Si un `pgEnum` est ajouté, le miroir Python doit l'être aussi.
- Tables « site-only » (sans miroir Python, ex. `seed_*`) : déclarées dans `SITE_ONLY_TABLES` (backend `tests/schema/conftest.py`).
- **Le backend Python ne doit contenir aucun DDL** (`CREATE/ALTER/DROP`, `create_all`) : vérifié par un test.

## Tables d'état runtime de l'agent (`src/db/schema/runtime.ts`)

`marketplace.preorder_drafts`, `procurement_drafts`, `sales_publish_drafts`, `mcp_idempotency_records`,
`public.agri_workspaces` : lues/écrites en SQL brut par le backend, **créées uniquement par les migrations**.

## Commandes interdites en production

- `drizzle-kit push` (compare le code à la base et peut supprimer des données) ; réservé à une base jetable.
- Toute modification de schéma hors migration (psql manuel, script `apply-schema-updates.sql`, DDL applicatif).

## Fichiers clés

- `drizzle.config.ts` — `schemaFilter` : `public`, `auth`, `governance`, `marketplace`, `intelligence` ; journal `public.__drizzle_migrations`.
- `drizzle/0000_baseline.sql`, `drizzle/meta/` — migrations et snapshots.
- `scripts/run-migrations.ts` — exécuteur ; `scripts/schema-drift-check.mjs` — contrôle de dérive.
- `.github/workflows/schema.yml` — CI : dérive, base vide → migrations → rejeu no-op → seed.
