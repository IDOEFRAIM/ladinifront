/**
 * Résilience DB — distingue les pannes TRANSITOIRES (connexion coupée, base saturée, timeout serveur)
 * des vraies erreurs applicatives, pour répondre 503 « réessayez » au lieu d'un 500 après 30 s.
 */
import { asError } from '@/lib/errors';

const CONNECTION_CODES = new Set([
  'CONNECT_TIMEOUT', 'CONNECTION_CLOSED', 'CONNECTION_ENDED', 'CONNECTION_DESTROYED',
  'ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'EPIPE', 'ENOTFOUND',
]);

/** Cause réelle : Drizzle enveloppe l'erreur postgres dans `cause`. */
function rootCode(err: unknown): string {
  let cur: unknown = err;
  for (let i = 0; i < 4 && cur; i++) {
    const code = asError(cur).code;
    if (typeof code === 'string' && code) return code;
    cur = (cur as { cause?: unknown }).cause;
  }
  return '';
}

/** Erreur de connexion : rejouer immédiatement sur une autre connexion a de bonnes chances de réussir. */
export function isConnectionError(err: unknown): boolean {
  const code = rootCode(err);
  return CONNECTION_CODES.has(code) || code.startsWith('08') || code === '57P01' || code === '57P02' || code === '57P03';
}

/** Erreur transitoire au sens large : connexion, timeout serveur (57014), trop de connexions (53300), verrou (55P03). */
export function isTransientDbError(err: unknown): boolean {
  const code = rootCode(err);
  return isConnectionError(err) || code === '57014' || code === '53300' || code === '55P03' || code === '40001' || code === '40P01';
}

/** Rejoue UNE fois sur erreur de connexion (jamais sur un timeout de requête : ça doublerait l'attente). */
export async function withDbRetry<T>(fn: () => Promise<T>, retries = 1, delayMs = 250): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= retries || !isConnectionError(err)) throw err;
      await new Promise((r) => setTimeout(r, delayMs * (attempt + 1)));
    }
  }
}
