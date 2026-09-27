// @vitest-environment node
// Test d'INTÉGRATION : prouve, sur le vrai PostgreSQL et avec le driver du site, qu'une transaction annulée ne
// laisse rien. N'écrit que dans une table TEMPORAIRE (détruite avec la session) — aucune donnée réelle touchée.
// Exécution : RUN_DB_TESTS=1 npx vitest run __tests__/db/rollback.integration.test.ts
import { describe, it, expect } from 'vitest';
import postgres from 'postgres';
import fs from 'fs';

const enabled = process.env.RUN_DB_TESTS === '1';

function url(): string {
  const line = fs.readFileSync('.env', 'utf8').split('\n').find((l) => l.startsWith('DATABASE_URL='));
  return (line ?? '').slice(13).replace(/^["']|["']$/g, '').split('?')[0];
}

describe.skipIf(!enabled)('rollback réel', () => {
  it('COMMIT complet ou ROLLBACK complet (table temporaire)', async () => {
    // max:1 → une seule session, donc la table TEMP reste visible entre les instructions.
    const sql = postgres(url(), { ssl: { rejectUnauthorized: false }, max: 1, prepare: false, connect_timeout: 5 });
    try {
      await sql`create temp table _ladini_tx_probe (id int primary key, note text)`;

      await expect(sql.begin(async (rawTx) => {
        const tx = rawTx as unknown as typeof sql;
        await tx`insert into _ladini_tx_probe values (1, 'a')`;
        await tx`insert into _ladini_tx_probe values (2, 'b')`;
        throw new Error('échec au milieu');
      })).rejects.toThrow('échec au milieu');
      expect((await sql`select count(*)::int as n from _ladini_tx_probe`)[0].n).toBe(0);

      await sql.begin(async (rawTx) => {
        const tx = rawTx as unknown as typeof sql;
        await tx`insert into _ladini_tx_probe values (1, 'a')`;
        await tx`insert into _ladini_tx_probe values (2, 'b')`;
      });
      expect((await sql`select count(*)::int as n from _ladini_tx_probe`)[0].n).toBe(2);

      // Violation d'unicité au milieu d'une transaction → rien n'est conservé, et le code SQLSTATE est 23505.
      const err = await sql.begin(async (rawTx) => {
        const tx = rawTx as unknown as typeof sql;
        await tx`insert into _ladini_tx_probe values (3, 'c')`;
        await tx`insert into _ladini_tx_probe values (1, 'dup')`;
      }).catch((e) => e);
      expect(err.code).toBe('23505');
      expect((await sql`select count(*)::int as n from _ladini_tx_probe`)[0].n).toBe(2);
    } finally {
      await sql.end();
    }
  }, 30_000);
});
