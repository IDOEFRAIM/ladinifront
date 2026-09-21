/**
 * Cache client « stale-while-revalidate » pour les lectures JSON (GET) de l'espace connecté.
 *
 * Problème corrigé : chaque visite d'une page (tableau de bord, sélecteur de zone…) relançait un appel serveur complet
 * derrière un spinner plein écran, et revenir sur la page repartait de zéro → sensation de « reload » permanent.
 *
 *  - dédoublonnage : N composants qui demandent la même URL en même temps = UN seul appel réseau ;
 *  - la dernière réponse est conservée en mémoire (durée max 5 min) : la page se réaffiche INSTANTANÉMENT avec ces
 *    données, puis se met à jour en arrière-plan ;
 *  - aucune persistance disque : la mémoire est vidée à chaque rechargement complet (connexion/déconnexion utilisent
 *    déjà window.location.href), donc jamais de données d'un utilisateur visibles par un autre.
 *  Ne pas utiliser pour des données qui exigent une fraîcheur stricte (paiement, stock au moment d'acheter).
 */
export const CLIENT_CACHE_MAX_AGE_MS = 5 * 60_000;

export class HttpError extends Error {
  constructor(readonly status: number, message = `HTTP ${status}`) {
    super(message);
    this.name = 'HttpError';
  }
}

interface Entry { data: unknown; at: number }
const store = new Map<string, Entry>();
const inflight = new Map<string, Promise<unknown>>();

/** Dernière réponse connue (et pas trop ancienne), sinon undefined. */
export function peekCache<T>(key: string): T | undefined {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (Date.now() - entry.at > CLIENT_CACHE_MAX_AGE_MS) {
    store.delete(key);
    return undefined;
  }
  return entry.data as T;
}

/** GET JSON dédoublonné ; met le résultat en cache. Lève HttpError (status) si la réponse n'est pas 2xx. */
export function fetchJsonDeduped<T>(url: string): Promise<T> {
  const pending = inflight.get(url);
  if (pending) return pending as Promise<T>;

  const request = (async () => {
    const res = await fetch(url, { credentials: 'same-origin' });
    if (!res.ok) throw new HttpError(res.status);
    const data = (await res.json()) as T;
    store.set(url, { data, at: Date.now() });
    return data;
  })().finally(() => inflight.delete(url));

  inflight.set(url, request);
  return request;
}

/** Vide le cache (tout, ou les clés commençant par `prefix`). À appeler après une mutation qui change ces données. */
export function invalidateClientCache(prefix?: string): void {
  if (!prefix) { store.clear(); return; }
  for (const key of [...store.keys()]) if (key.startsWith(prefix)) store.delete(key);
}
