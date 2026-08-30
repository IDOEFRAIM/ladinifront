# Drizzle Migration Workflow

## 1. Context

- La base de données PostgreSQL de production contient déjà 47 tables sur les schémas `auth`, `governance`, `marketplace`, `intelligence` et `public`.
- Le snapshot `drizzle/meta/0000_snapshot.json` et le fichier `drizzle/0000_ambiguous_firedrake.sql` reflètent l'état actuel de `src/db/schema`.
- `drizzle-kit generate` et `drizzle-kit check` valident qu'il n'y a **aucune divergence** entre le code et le snapshot.
- L'objectif est de faire reconnaître à Drizzle que la base est déjà à jour, puis de n'appliquer que des migrations **additives**.

## 2. Scripts disponibles

```json
{
  "generate": "drizzle-kit generate",
  "db:push": "drizzle-kit push",
  "db:studio": "drizzle-kit studio",
  "db:seed": "tsx scripts/seed.ts",
  "db:baseline": "tsx scripts/baseline-drizzle.ts",
  "db:migrate": "tsx scripts/run-migrations.ts",
  "db:introspect": "drizzle-kit introspect --config=drizzle.config.ts"
}
```

## 3. Procédure de synchronisation initiale (production, sans perte)

### 3.1 Vérifier la cohérence code ↔ snapshot

```bash
npx drizzle-kit check --config=drizzle.config.ts
npx drizzle-kit generate --config=drizzle.config.ts
```

Si `generate` répond `No schema changes, nothing to migrate`, le code est aligné avec le snapshot.  
S'il génère un fichier `0001_...`, **ne pas l'appliquer** : relire le SQL généré et corriger `src/db/schema` pour qu'il ne génère que des changements intentionnels.

### 3.2 Baseline : indiquer à Drizzle que `0000` est déjà appliquée

La base de données a été créée par `drizzle/0000_ambiguous_firedrake.sql` mais la table `__drizzle_migrations` peut être vide ou absente. On l'initialise avec un hash sans exécuter le SQL de `0000` (donc aucune donnée n'est touchée). Le schéma de suivi est `public.__drizzle_migrations` (configuré dans `drizzle.config.ts` et dans les scripts).

```bash
npm run db:baseline
```

Ce que fait `scripts/baseline-drizzle.ts` :

1. Crée `public.__drizzle_migrations` si elle n'existe pas (`id`, `hash`, `created_at`).
2. Lit le journal `drizzle/meta/_journal.json` pour récupérer le `when` de la migration `0000`.
3. Calcule le SHA-256 du fichier `0000_ambiguous_firedrake.sql`.
4. Insère le hash et le timestamp `when` dans `__drizzle_migrations` si ce n'est pas déjà fait.

### 3.3 Vérifier que `migrate` ne déclenche rien

```bash
npm run db:migrate
```

Attendu : `Migrations applied successfully.` sans aucune requête `CREATE`/`DROP` (la baseline `0000` est reconnue comme déjà appliquée).

## 4. Workflow de migrations futures (additif uniquement)

### 4.1 Ajouter une nouvelle table/colonne dans `src/db/schema`

Ne jamais supprimer ni modifier une colonne existante. Exemple additif :

```ts
export const newFeature = marketplaceSchema.table('new_feature', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

Puis exporter-la dans `src/db/schema/index.ts`.

### 4.2 Générer la migration

```bash
npx drizzle-kit generate --config=drizzle.config.ts
```

Vérifier manuellement le fichier SQL généré dans `drizzle/0001_...sql` : il ne doit contenir que des `CREATE TABLE` ou des `ALTER TABLE ... ADD COLUMN`.  
**Si un `DROP` ou un `ALTER TABLE ... DROP COLUMN` apparaît, ne pas l'appliquer.** Corriger le schéma et regénérer.

### 4.3 Appliquer en production

```bash
npm run db:migrate
```

Cet appel :

- Utilise `__drizzle_migrations` pour ne jamais rejouer une migration déjà appliquée.
- Exécute les migrations manquantes dans une transaction.
- Ne touche pas aux tables existantes si elles ne sont pas dans la nouvelle migration.

### 4.4 Introspection ponctuelle (si la base a évolué en dehors de Drizzle)

```bash
npx drizzle-kit introspect --config=drizzle.config.ts
```

Cette commande génère un fichier `drizzle/schema.ts` à partir de la base. Utilisez-le pour comparer avec `src/db/schema` et ajouter **manuellement** les tables/colonnes manquantes dans le code (source de vérité : la base).  
**Ne pas écraser `src/db/schema` directement**, sinon vous perdriez les types, enums et relations métier.

## 5. Commandes à éviter en production

- `drizzle-kit push --force` : supprime/recrée des tables et colonnes sans passer par les migrations. C'était la cause des erreurs `relation already exists`. Le script `db:push` a été corrigé pour ne plus contenir `--force`.
- `drizzle-kit push` tout court en production : il compare le code à la base et propose des modifications destructrices. À réserver à un environnement de développement jetable.

## 6. Checklist de sécurité

Avant chaque `npm run db:migrate` ou `npx drizzle-kit generate` en production :

- [ ] `drizzle-kit check` est OK.
- [ ] `drizzle-kit generate` ne génère aucune requête `DROP`.
- [ ] Un backup de la base a été fait.
- [ ] Le fichier SQL généré est relu.
- [ ] `public.__drizzle_migrations` contient bien `0000` après le baseline.

## 7. Fichiers clés

- `drizzle.config.ts` : `schemaFilter` inclut `['public', 'auth', 'governance', 'marketplace', 'intelligence']` ; `migrations` pointe sur `public.__drizzle_migrations`.
- `drizzle/0000_ambiguous_firedrake.sql` : migration baseline.
- `drizzle/meta/0000_snapshot.json` : snapshot utilisé pour générer les différences.
- `scripts/baseline-drizzle.ts` : script de baseline.
- `scripts/run-migrations.ts` : runner de migrations.
