import { sql, type SQL } from 'drizzle-orm';
import { db } from '@/src/db';
import type { Period } from './period';

/** Exécute une requête SQL brute et retourne les lignes typées. */
export async function rows<T = Record<string, unknown>>(query: SQL): Promise<T[]> {
  const res = await db.execute(query);
  return Array.from(res as unknown as T[]);
}

export const num = (v: unknown): number => (v === null || v === undefined ? 0 : Number(v));
export const numOrNull = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));
export const ratio = (a: number, b: number): number | null => (b > 0 ? a / b : null);

/** Bornes de période (timestamptz) réutilisables dans les templates `sql`. */
export const bounds = (p: Period) => ({
  from: sql`${p.from.toISOString()}::timestamptz`,
  to: sql`${p.to.toISOString()}::timestamptz`,
  prevFrom: sql`${p.prevFrom.toISOString()}::timestamptz`,
  prevTo: sql`${p.prevTo.toISOString()}::timestamptz`,
});

/** « intention comprise » : reconnue, différente de UNKNOWN*, et tour non terminé en clarification (alias de table : t). */
export const UNDERSTOOD = sql`(t.intent IS NOT NULL AND upper(t.intent) NOT LIKE 'UNKNOWN%' AND t.outcome <> 'CLARIFICATION')`;

/** percentile_cont(q) sur une colonne (nom de colonne interne, jamais issu d'une entrée utilisateur). */
export const pctExpr = (col: string, q: number): string => `percentile_cont(${q}) WITHIN GROUP (ORDER BY ${col})`;
export const pct = (col: string, q: number) => sql.raw(pctExpr(col, q));

/** [p50, p95, p99] en UN SEUL tri (percentile_cont accepte un tableau de fractions) — 3× moins coûteux que 3 appels séparés. */
export const pctArrayExpr = (col: string): string => `percentile_cont(ARRAY[0.5, 0.95, 0.99]) WITHIN GROUP (ORDER BY ${col})`;
export const pctArray = (col: string) => sql.raw(pctArrayExpr(col));
export const at = (v: unknown, i: number): number | null => (Array.isArray(v) && v[i] !== null && v[i] !== undefined ? Number(v[i]) : null);
