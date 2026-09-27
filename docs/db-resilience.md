# Accès PostgreSQL — pool, budgets, résilience

Le site n'est **pas** le seul client de la base (FastAPI, workers Celery/Beat, scripts, migrations). Chaque
connexion du site est identifiable dans `pg_stat_activity` par `application_name` : `ladini-site` (métier) et
`ladini-site-auth` (authentification / permissions).

## 1. Budget de connexions

| Élément | Valeur par défaut | Variable |
|---|---|---|
| Total par instance (métier + auth), long-running | **10** = 7 métier + 3 auth | `DB_POOL_MAX`, `DB_AUTH_POOL_MAX` |
| Total par instance, serverless (`VERCEL` ou `DB_MODE=serverless`) | **4** = 2 + 2 | idem |
| Instances du site (déclaratif) | 1 | `DB_SITE_INSTANCES` |
| Budget théorique du site | `total × instances` (loggé au démarrage : `db_pool_init`) | — |

Règle : `site_total × instances_site + backend Python + workers + Beat + migrations + marge (≥ 20 %) ≤ capacité
réelle de la base`. **À renseigner par l'exploitation** (non déterminable depuis le dépôt) : nombre d'instances du
site, pool de FastAPI et de chaque worker, `max_connections` réel du plan (l'instance mesurée annonce 1706, valeur
RDS non représentative d'un plan Heroku).

`pgbouncer=true` dans `DATABASE_URL` **n'active rien** : l'hôte est un RDS direct (le paramètre est retiré avant la
connexion). Si un vrai PgBouncer est ajouté, garder `prepare: false`.

Pools : un seul jeu par process, stocké dans `globalThis` **y compris en production** (auparavant seulement en dev :
un module dupliqué entre bundles Next aurait ouvert plusieurs pools). Test : `__tests__/db/pool-singleton.test.ts`.

## 2. Budgets de temps

Mesures (client → RDS us-east-1, depuis le poste de dev) : TCP ≈ 200 ms, TLS ≈ 600 ms, connexion froide ≈ 1,4–1,6 s,
aller-retour ≈ 220–400 ms, exécution serveur d'une lecture PK < 0,1 ms.

| Catégorie | statement_timeout (serveur) | budget d'appel (site) |
|---|---|---|
| Connexion | `connect_timeout` 5 s | — |
| Auth / permissions (`dbAuth`) | 4 s | 5 s |
| Interactif / métier (`db`) | 10 s | 12 s |
| Long explicite | `withStatementTimeout(ms, …)` | `dbOp(..., { timeoutMs })` |

## 3. Retries

| Erreur | Classe | Retry du site |
|---|---|---|
| ECONNRESET, ECONNREFUSED, CONNECTION_CLOSED, CONNECT_TIMEOUT, 08xxx, 57P01-03 | `connection` | **1 seul**, lecture ou écriture explicitement idempotente |
| 57014 (timeout SQL), timeout d'appel, 53xxx, verrous/deadlock | `statement_timeout` / `op_timeout` / `overload` / `lock` | **jamais** (503 + Retry-After) |
| 23505 / 23503 | `conflict` | jamais (409) |
| autres 23xxx | `integrity` | jamais (422) |
| tout le reste (SQL invalide, bug) | `logic` | jamais (500, non masqué) |

Les écritures ne sont **jamais** rejouées automatiquement (`kind: 'write'`), sauf `idempotent: true` explicite.
La cause est lue en descendant dans `cause` (Drizzle enveloppe l'erreur postgres dans « Failed query »).

## 4. Fail closed / fail open

| Donnée / opération | DB indisponible |
|---|---|
| Rôle, permissions, appartenance organisation, zones, `producerId` (A) | **Refus 503.** Cache frais uniquement (TTL 10 s), jamais périmé |
| Admin, changement de rôle, paiement, suppression, validation financière, accès tenant critique (B) | **Refus 503**, contexte relu en base (`fresh`), aucun cache |
| `/api/me` | 503 + `Retry-After` ; le client garde son état déjà hydraté |
| Lecture publique (catalogue, produits publics) (C) | Repli possible dans sa propre couche |

Implémentation : `lib/access-context.ts` (aucun contexte périmé servi), `lib/api-guard.ts` (routes ADMIN ⇒ `fresh`),
`lib/action-guard.ts` (`sensitive: true`, actions ADMIN implicites). Le cache est local au process : une révocation
prend au plus `AUTHZ_CACHE_TTL_MS` (10 s) sur les **autres** instances.

## 5. Codes HTTP (lib/db-http.ts)

503 + `Retry-After` indisponibilité temporaire · 409 conflit (unicité, FK, version) · 422 intégrité · 404 introuvable ·
500 erreur réelle (jamais masquée, message générique) · 401/403 décidés par l'authentification avant toute requête métier.

## 6. Observabilité

Logs JSON (`db_op`) : `operation_name`, `category`, `duration_ms`, `success`, `attempts`, `error_class`, `error_code`,
`request_id`. Jamais de SQL/paramètres/URL (`redactSecrets`). Succès loggés seulement si ≥ 1 s (`DB_LOG_ALL=1` pour tout).
Métriques : `GET /api/admin/db-metrics` (admin) — `db_pool_active`, `db_pool_waiting` (estimation), `db_pool_idle`,
`db_query_duration_ms` (p50/p95/p99 par opération), `db_query_timeout_total`, `db_connection_error_total`,
`db_retry_total`, `db_connections_closed_total` (churn), `server_connections` (vue serveur, tous clients).

**Limites assumées** : postgres-js n'expose pas l'acquisition du pool → `duration_ms` = acquisition + exécution ;
`db_pool_waiting` est une estimation (appels en vol − capacité). La décomposition DNS/TCP/TLS/requête est fournie par
`npm run db:diagnose`. Seules les opérations enveloppées par `dbOp` sont chronométrées (aujourd'hui : chargement du
contexte d'accès) — étendre progressivement aux requêtes critiques.

## 7. Outils

- `npm run db:diagnose` — DNS/TCP/TLS/connexion/requêtes/EXPLAIN, lecture seule, sans secrets.
- `npm run db:loadtest [pool]` — charge en lecture seule (forme `/api/me`), 1/10/50/100, pool borné.
- `npm run db:verify-access` — équivalence de la requête unique avec les anciennes lectures + plan.
- `npm run test:db` — inclut le test de rollback sur le vrai PostgreSQL (table temporaire, aucune donnée touchée).

## 8. Écritures métier faites directement par le site (risque de concurrence avec l'agent / le backend)

| Domaine | État | Recommandation |
|---|---|---|
| Enchères (offre, attribution, annulation, règlement) | Transactions + verrouillage optimiste `version` déjà en place | Rester direct **tant que** le backend Python applique le même `version` ; sinon migrer vers une couche unique |
| Commandes, précommandes, livraison, stocks | Transactions | **Migrer vers le backend / service domaine** : l'agent crée aussi des commandes et écrit le stock |
| Produits (mise à jour) | Précondition optionnelle `expectedUpdatedAt` → 409 | Ajouter une vraie colonne `version` (migration) ; `updated_at` n'est bumpé que par les écritures qui le font |
| Paiement / statut de paiement | Hors périmètre du dépôt site | Exclusivement backend (idempotence obligatoire) |
| Profil producteur, fermes, organisations, rôles, allocations | Écritures unitaires sans version | Direct acceptable ; risque « last write wins » si l'agent édite les mêmes champs |
| Rôle utilisateur | `updateUserRole` + purge du cache local | Doit rester une action ADMIN `sensitive` |

## 9. Reste à faire (hors périmètre de ce chantier)

1. Mesurer la latence réseau **depuis l'hôte de production** (`npm run db:diagnose` sur place) : à ≈ 220 ms d'aller-retour,
   le débit d'un pool est `connexions ÷ latence` (≈ 13 req/s pour 3 connexions) ; héberger site et base dans la même région est le levier n° 1.
2. Colonne `version` (migration) sur `products`, `orders`, `stock` ; `expectedVersion` dans les formulaires d'édition.
3. Clés d'idempotence sur les écritures rejouables (création de commande, paiement, webhooks) ; `mcp_idempotency_records` existe côté backend.
4. Étendre `dbOp` / `dbErrorResponse` aux ~100 routes API restantes (aujourd'hui : accès/auth, `/api/me`, `secureAction`).
5. `NODE_TLS_REJECT_UNAUTHORIZED=0` est défini dans `.env` : il désactive la vérification TLS pour tout le process. À retirer en production ; fournir `DB_SSL_CA_PATH` pour une vérification stricte.
6. Le middleware retombe sur le cookie `user-role` (non signé) si le rôle du jeton manque : à remplacer par le seul jeton signé.
