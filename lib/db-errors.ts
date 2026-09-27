/**
 * Classification des erreurs DB — module PUR (aucune connexion), importable partout.
 *
 * Principes :
 *  - on analyse la chaîne `cause` (Drizzle enveloppe l'erreur postgres dans « Failed query » sans code) ;
 *  - « transitoire » (→ 503) ≠ « rejouable » : un timeout SQL est transitoire mais ne doit JAMAIS être rejoué
 *    (il doublerait l'attente et la charge sur une base déjà lente) ;
 *  - l'HTTP est décidé ici, une seule fois, pour ne pas convertir les erreurs DB « n'importe comment ».
 */
import { asError } from '@/lib/errors';

export type DbErrorClass =
  | 'connection'         // socket/DNS/TLS/refus : le serveur n'a (probablement) rien exécuté
  | 'op_timeout'         // budget d'appel côté site dépassé (acquisition pool + exécution)
  | 'statement_timeout'  // le serveur a annulé la requête (57014)
  | 'overload'           // trop de connexions / ressources (53xxx)
  | 'lock'               // verrou / deadlock / sérialisation
  | 'conflict'           // unicité / FK / concurrence optimiste
  | 'integrity'          // autre contrainte d'intégrité (not null, check…)
  | 'not_found'
  | 'logic';             // tout le reste : bug ou SQL invalide → 500, jamais masqué

export interface DbErrorInfo {
  errorClass: DbErrorClass;
  /** Indisponibilité temporaire : le client peut réessayer plus tard (503). */
  transient: boolean;
  /** Le site peut rejouer LUI-MÊME l'opération (lecture / idempotente uniquement). */
  retryable: boolean;
  status: 400 | 404 | 409 | 422 | 500 | 503;
  code: string;
}

/** Erreur levée quand un appel dépasse son budget de temps côté site. */
export class DbOpTimeoutError extends Error {
  readonly code = 'DB_OP_TIMEOUT';
  constructor(readonly operation: string, readonly budgetMs: number) {
    super(`Database operation "${operation}" exceeded ${budgetMs} ms`);
    this.name = 'DbOpTimeoutError';
  }
}

/** Délestage : trop d'appels déjà en attente d'une connexion — répondre vite (503) plutôt que d'empiler. */
export class DbQueueFullError extends Error {
  readonly code = 'DB_QUEUE_FULL';
  constructor(readonly operation: string, readonly limit: number) {
    super(`Database queue full for "${operation}" (limit ${limit})`);
    this.name = 'DbQueueFullError';
  }
}

/** Conflit de concurrence optimiste : la ligne a changé depuis la lecture (→ 409). */
export class OptimisticConflictError extends Error {
  readonly code = 'OPTIMISTIC_CONFLICT';
  constructor(readonly entity: string, message = `Conflit de version sur ${entity} : la donnée a été modifiée entre-temps.`) {
    super(message);
    this.name = 'OptimisticConflictError';
  }
}

const CONNECTION_CODES = new Set([
  'CONNECT_TIMEOUT', 'CONNECTION_CLOSED', 'CONNECTION_ENDED', 'CONNECTION_DESTROYED',
  'ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'EPIPE', 'ENOTFOUND', 'EAI_AGAIN',
]);

/** Code réel, en descendant dans `cause` (jusqu'à 4 niveaux). */
export function rootDbCode(err: unknown): string {
  let cur: unknown = err;
  for (let i = 0; i < 4 && cur; i++) {
    const code = asError(cur).code;
    if (typeof code === 'string' && code) return code;
    cur = (cur as { cause?: unknown }).cause;
  }
  return '';
}

export function classifyDbError(err: unknown): DbErrorInfo {
  if (err instanceof DbOpTimeoutError) {
    return { errorClass: 'op_timeout', transient: true, retryable: false, status: 503, code: err.code };
  }
  if (err instanceof DbQueueFullError) {
    return { errorClass: 'overload', transient: true, retryable: false, status: 503, code: err.code };
  }
  if (err instanceof OptimisticConflictError) {
    return { errorClass: 'conflict', transient: false, retryable: false, status: 409, code: err.code };
  }
  const code = rootDbCode(err);
  if (CONNECTION_CODES.has(code) || code.startsWith('08') || code === '57P01' || code === '57P02' || code === '57P03') {
    return { errorClass: 'connection', transient: true, retryable: true, status: 503, code };
  }
  if (code === '57014') return { errorClass: 'statement_timeout', transient: true, retryable: false, status: 503, code };
  if (code.startsWith('53')) return { errorClass: 'overload', transient: true, retryable: false, status: 503, code };
  if (code === '55P03' || code === '40P01' || code === '40001') {
    return { errorClass: 'lock', transient: true, retryable: false, status: 503, code };
  }
  if (code === '23505' || code === '23503') return { errorClass: 'conflict', transient: false, retryable: false, status: 409, code };
  if (code.startsWith('23')) return { errorClass: 'integrity', transient: false, retryable: false, status: 422, code };
  if (asError(err).message === 'USER_NOT_FOUND') {
    return { errorClass: 'not_found', transient: false, retryable: false, status: 404, code: 'USER_NOT_FOUND' };
  }
  return { errorClass: 'logic', transient: false, retryable: false, status: 500, code: code || 'UNKNOWN' };
}

export const isTransientDbError = (err: unknown): boolean => classifyDbError(err).transient;
export const isConnectionError = (err: unknown): boolean => classifyDbError(err).errorClass === 'connection';

/** Délai suggéré au client (secondes) pour l'en-tête Retry-After. */
export function retryAfterSeconds(info: DbErrorInfo): number {
  switch (info.errorClass) {
    case 'connection': return 2;
    case 'overload': return 10;
    default: return 5;
  }
}
