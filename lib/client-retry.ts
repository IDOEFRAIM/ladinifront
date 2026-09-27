/**
 * Retry HTTP côté client — borné, avec backoff court, sans boucle infinie.
 *
 *   503 / 429 → réessai (max `maxRetries`), en respectant Retry-After (plafonné)
 *   500       → PAS de retry (erreur réelle)
 *   401 / 403 → rendus tels quels (flux de session normal)
 *   409       → rendu tel quel : l'appelant doit rafraîchir ses données, pas réécrire à l'aveugle
 *   réseau    → 1 réessai par tentative disponible, même backoff
 */
export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  sleep?: (ms: number) => Promise<void>;
  signal?: AbortSignal;
}

const RETRYABLE_STATUS = new Set([429, 503]);

/** Délai (ms) demandé par Retry-After (secondes ou date HTTP), plafonné. */
export function parseRetryAfter(header: string | null, maxMs: number): number | null {
  if (!header) return null;
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.min(seconds * 1000, maxMs);
  const date = Date.parse(header);
  if (Number.isFinite(date)) return Math.min(Math.max(0, date - Date.now()), maxMs);
  return null;
}

export async function fetchWithRetry(
  doFetch: () => Promise<Response>,
  { maxRetries = 2, baseDelayMs = 800, maxDelayMs = 8000, sleep = (ms) => new Promise((r) => setTimeout(r, ms)), signal }: RetryOptions = {}
): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    let res: Response | null = null;
    try {
      res = await doFetch();
    } catch (err) {
      if (signal?.aborted || attempt >= maxRetries) throw err;
    }
    if (res && (!RETRYABLE_STATUS.has(res.status) || attempt >= maxRetries)) return res;
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

    // Backoff exponentiel court avec gigue ; Retry-After du serveur prioritaire (plafonné).
    const backoff = Math.min(baseDelayMs * 2 ** attempt, maxDelayMs) * (0.75 + Math.random() * 0.5);
    const wait = (res && parseRetryAfter(res.headers.get('Retry-After'), maxDelayMs)) ?? backoff;
    await sleep(wait);
  }
}
