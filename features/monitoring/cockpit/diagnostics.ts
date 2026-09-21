import { sql } from 'drizzle-orm';
import { rows, num } from './db';

export interface Diagnostics {
  database: string;
  tablesPresent: boolean;
  turnsTotal: number;
  lastTurnAt: string | null;
  status: 'OK' | 'NO_TABLES' | 'NO_DATA' | 'STALE';
  message: string;
}

/** `hôte:port/base` extrait de DATABASE_URL, sans identifiants — à comparer avec le journal `TURN_TELEMETRY | base=…` du worker. */
export function describeDatabase(url = process.env.DATABASE_URL ?? ''): string {
  try {
    const u = new URL(url);
    return `${u.hostname || '?'}:${u.port || '5432'}/${u.pathname.replace(/^\//, '') || '?'}`;
  } catch { return 'inconnue'; }
}

const STALE_HOURS = 24;

/** Pourquoi le cockpit serait vide : tables absentes, aucun tour reçu, ou flux arrêté. */
export async function fetchDiagnostics(): Promise<Diagnostics> {
  const database = describeDatabase();
  const [t] = await rows<{ present: boolean }>(sql`SELECT to_regclass('intelligence.agent_turns') IS NOT NULL AS present`);
  if (!t?.present) {
    return { database, tablesPresent: false, turnsTotal: 0, lastTurnAt: null, status: 'NO_TABLES',
      message: 'Les tables de télémétrie n\'existent pas dans cette base : appliquer la migration Drizzle 0001 (npm run db:migrate).' };
  }
  const [r] = await rows<{ n: string; last: Date | null }>(sql`SELECT count(*)::text AS n, max(created_at) AS last FROM intelligence.agent_turns`);
  const turnsTotal = num(r?.n);
  const lastTurnAt = r?.last ? new Date(r.last).toISOString() : null;
  if (turnsTotal === 0) {
    return { database, tablesPresent: true, turnsTotal, lastTurnAt, status: 'NO_DATA',
      message: 'Les tables existent mais aucun tour n\'a jamais été enregistré. Vérifier : (1) le worker Celery tourne avec la version récente et AGENT_MONITORING_ENABLED=true ; (2) DATABASE_URL du backend cible bien cette même base (journal de démarrage « TURN_TELEMETRY | base=… ») ; (3) les logs du worker ne contiennent pas TURN_TELEMETRY_WRITE_FAILED ; (4) au moins un message a été traité par la file Celery.' };
  }
  const ageH = lastTurnAt ? (Date.now() - new Date(lastTurnAt).getTime()) / 3600_000 : Infinity;
  if (ageH > STALE_HOURS) {
    return { database, tablesPresent: true, turnsTotal, lastTurnAt, status: 'STALE',
      message: `Dernier tour enregistré il y a ${Math.round(ageH)} h : soit aucun message depuis, soit l'écriture s'est arrêtée (chercher TURN_TELEMETRY_WRITE_FAILED dans les logs du worker).` };
  }
  return { database, tablesPresent: true, turnsTotal, lastTurnAt, status: 'OK', message: 'Télémétrie active.' };
}
