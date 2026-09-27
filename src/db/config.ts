/**
 * Configuration DB — fonction PURE (testable) : aucune connexion ici.
 *
 * BUDGET DE CONNEXIONS
 * Le site n'est PAS le seul client de PostgreSQL (FastAPI, workers, scripts, migrations).
 * Budget théorique du site = (poolBusiness + poolAuth) × nombre d'instances du site.
 * Voir docs/db-connection-budget.md. Les valeurs par défaut sont volontairement basses.
 *
 * BUDGETS DE TEMPS (choisis d'après les mesures : requête PK ≈ 120 ms, connexion SSL froide ≈ 1,4–1,7 s)
 *   connexion            5 s   (≈ 3× la connexion froide mesurée)
 *   auth / permissions   statement 4 s, appel 5 s   (requêtes PK/index : ≈ 30× de marge)
 *   interactif / métier  statement 10 s, appel 12 s
 *   long, explicite      withStatementTimeout(ms, …) — jamais par défaut
 */

export type DeployMode = 'serverless' | 'long-running';

export interface DbConfig {
  mode: DeployMode;
  business: { max: number; statementTimeoutMs: number; opTimeoutMs: number };
  auth: { max: number; statementTimeoutMs: number; opTimeoutMs: number };
  /** File d'attente tolérée = max × facteur ; au-delà, délestage immédiat (503) au lieu d'une attente qui gonfle. */
  queueFactor: number;
  connectTimeoutSec: number;
  idleTimeoutSec: number;
  maxLifetimeSec: number;
  /** Nombre d'instances du site (déclaratif) — sert uniquement au calcul du budget théorique. */
  siteInstances: number;
  theoreticalSiteConnections: number;
}

type Env = Record<string, string | undefined>;

function int(value: string | undefined, fallback: number, min = 1): number {
  const n = parseInt(value ?? '', 10);
  return Number.isFinite(n) && n >= min ? n : fallback;
}

export function resolveDbConfig(env: Env): DbConfig {
  const mode: DeployMode = env.VERCEL || env.DB_MODE === 'serverless' ? 'serverless' : 'long-running';
  const serverless = mode === 'serverless';

  // DB_POOL_MAX = total par instance (business + auth). Serverless : pool minuscule, l'instance est éphémère.
  const total = int(env.DB_POOL_MAX, serverless ? 4 : 10, 2);
  const authMax = Math.min(int(env.DB_AUTH_POOL_MAX, serverless ? 2 : 3), total - 1);
  const businessMax = total - authMax;
  const siteInstances = int(env.DB_SITE_INSTANCES, 1);

  return {
    mode,
    business: {
      max: businessMax,
      statementTimeoutMs: int(env.DB_STATEMENT_TIMEOUT_MS, 10_000, 500),
      opTimeoutMs: int(env.DB_OP_TIMEOUT_MS, 12_000, 500),
    },
    auth: {
      max: authMax,
      statementTimeoutMs: int(env.DB_AUTH_STATEMENT_TIMEOUT_MS, 4_000, 500),
      opTimeoutMs: int(env.DB_AUTH_OP_TIMEOUT_MS, 5_000, 500),
    },
    queueFactor: int(env.DB_QUEUE_FACTOR, 12),
    connectTimeoutSec: int(env.DB_CONNECT_TIMEOUT_SEC, 5),
    // Long-running : garder les connexions chaudes (une reconnexion SSL coûte ≈ 1,5 s).
    // Serverless : l'instance gèle entre deux requêtes, une connexion « idle » longue est trompeuse → courte.
    idleTimeoutSec: int(env.DB_IDLE_TIMEOUT_SEC, serverless ? 20 : 120),
    maxLifetimeSec: int(env.DB_MAX_LIFETIME_SEC, serverless ? 60 : 1800),
    siteInstances,
    theoreticalSiteConnections: total * siteInstances,
  };
}

/** Retire toute information sensible d'un texte (URL de connexion, mot de passe) avant log. */
export function redactSecrets(text: string): string {
  return text
    .replace(/[a-z][a-z0-9+.-]*:\/\/[^\s'"]+/gi, (m) => (/^https?:\/\//i.test(m) ? m : '[redacted-url]'))
    .replace(/(password|passwd|pwd|secret|token)\s*[=:]\s*[^\s,;&'"]+/gi, '$1=[redacted]');
}
