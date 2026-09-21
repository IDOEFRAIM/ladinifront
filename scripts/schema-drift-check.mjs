// Vérifie que le schéma TypeScript (src/db/schema) et les migrations commitées sont identiques :
// `drizzle-kit generate` ne doit RIEN produire. Utilisé en CI (.github/workflows/schema.yml) et avant chaque commit de schéma.
import { execSync } from 'node:child_process';
import { readdirSync } from 'node:fs';

const before = new Set(readdirSync('drizzle'));
const out = execSync('npx drizzle-kit generate --name=_drift_probe', { encoding: 'utf8' });
const after = readdirSync('drizzle');
const created = after.filter((f) => !before.has(f));
if (created.length || !/nothing to migrate/i.test(out)) {
  console.error('Dérive détectée : src/db/schema ≠ migrations commitées. Lancer `npx drizzle-kit generate` et commiter le résultat.');
  console.error(created.join(', '));
  process.exit(1);
}
console.log('Schéma TypeScript et migrations alignés.');
