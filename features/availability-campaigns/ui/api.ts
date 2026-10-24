const BASE = '/api/admin/availability-campaigns';

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Appel de l'adaptateur serveur (jamais le backend directement). Les erreurs portent le message métier ou un texte générique. */
export async function callApi<T>(method: 'GET' | 'POST' | 'PATCH', path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    credentials: 'same-origin',
    cache: 'no-store',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let payload: unknown = null;
  try { payload = await res.json(); } catch { /* corps non JSON */ }
  if (!res.ok) {
    const message = (payload as { error?: string } | null)?.error
      || (res.status === 401 || res.status === 403 ? 'Accès réservé aux administrateurs.' : `Erreur ${res.status}`);
    throw new ApiError(message, res.status);
  }
  return payload as T;
}

export const errorMessage = (e: unknown): string => (e instanceof Error ? e.message : 'Erreur réseau');
