import { NextResponse, type NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/api-guard';

/**
 * Adaptateur serveur des endpoints admin analytics acheteurs.
 *
 * - Auth : `requireAdmin` (session admin existante) AVANT tout appel au backend (401/403 sinon).
 * - Le navigateur ne voit JAMAIS le backend ni son jeton : ce module appelle `/internal/analytics/buyers/*`
 *   (serveur-à-serveur, en-tête `X-Internal-Token`).
 * - Aucune logique KPI ici ni ailleurs en TypeScript : le backend (`AnalyticsService`) est la seule source des formules.
 * - Seuls les paramètres d'une liste blanche sont transmis ; les erreurs internes ne fuient pas (502 générique).
 */

export const ALLOWED_PARAMS = ['from', 'to', 'zone_id', 'category_id', 'sub_category_id', 'journey', 'granularity', 'dimension', 'limit', 'offset', 'metric', 'prev_from', 'prev_to'] as const;
export const METRIC_RE = /^[a-z][a-z0-9_]{0,63}$/;
const TIMEOUT_MS = 20_000;
const NO_STORE = { 'Cache-Control': 'no-store' };

export function buildUpstreamUrl(base: string, path: string, source: URLSearchParams): string {
  const q = new URLSearchParams();
  for (const key of ALLOWED_PARAMS) {
    const v = source.get(key);
    if (v !== null && v !== '') q.set(key, v.slice(0, 80));
  }
  const qs = q.toString();
  return `${base.replace(/\/$/, '')}/internal/analytics/buyers/${path}${qs ? `?${qs}` : ''}`;
}

export async function analyticsProxy(req: NextRequest, path: string, precheck?: () => Response | null): Promise<Response> {
  const { error } = await requireAdmin(req);
  if (error) return error;
  const invalid = precheck?.();
  if (invalid) return invalid;

  const base = process.env.LADINI_BACKEND_URL;
  const token = process.env.INTERNAL_API_TOKEN;
  if (!base || !token) {
    console.error('[analytics] LADINI_BACKEND_URL / INTERNAL_API_TOKEN non configurés');
    return NextResponse.json({ error: 'Analytics indisponible (configuration serveur).' }, { status: 503, headers: NO_STORE });
  }

  try {
    const upstream = await fetch(buildUpstreamUrl(base, path, new URL(req.url).searchParams), {
      headers: { 'X-Internal-Token': token, Accept: 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: 'no-store',
    });
    if (upstream.ok) return NextResponse.json(await upstream.json(), { headers: NO_STORE });
    if (upstream.status === 400 || upstream.status === 404) {
      let detail = 'Requête invalide.';
      try { detail = ((await upstream.json()) as { detail?: string }).detail || detail; } catch { /* corps non JSON */ }
      return NextResponse.json({ error: detail }, { status: upstream.status, headers: NO_STORE });
    }
    console.error('[analytics] backend a répondu', upstream.status);
    return NextResponse.json({ error: 'Le service analytics est momentanément indisponible.' }, { status: 502, headers: NO_STORE });
  } catch (e) {
    console.error('[analytics] appel backend en échec', (e as Error).name);
    return NextResponse.json({ error: 'Le service analytics est momentanément indisponible.' }, { status: 502, headers: NO_STORE });
  }
}
