# Cockpit `/admin/monitoring`

Ce dépôt porte les **tables de télémétrie** (`src/db/schema/telemetry.ts`, migration `0001`), les **read models** (`features/monitoring/cockpit/*`),
les **endpoints** (`app/api/admin/monitoring/*`) et l'**interface** (`features/monitoring/cockpit/ui/*`).

Documentation complète (architecture, définition de chaque métrique, confidentialité, rétention, mesures de performance, risques) :
dépôt backend `ladini` → `docs/monitoring/{MONITORING_COCKPIT_PLAN,METRICS,COCKPIT}.md`.

Commandes utiles :

```bash
npm run db:migrate                                   # applique 0001 (additive)
MONITORING_TEST_DATABASE_URL=... npx vitest run __tests__/monitoring   # tests d'intégration sur une base jetable VIDE de télémétrie
DATABASE_URL=... DISABLE_SSLMODE=true npx tsx scripts/monitoring-bench.ts   # coût des vues
```
