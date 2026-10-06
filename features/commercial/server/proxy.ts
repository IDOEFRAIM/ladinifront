import { NextResponse, type NextRequest } from 'next/server';
import { requireCommercial } from '@/lib/api-guard';

/**
 * Adaptateur serveur de l'espace COMMERCIAL (relances manuelles), même
 * schéma que `features/analytics/server/proxy.ts` :
 *
 * - Auth : `requireCommercial` (session ADMIN/SUPERADMIN/COMMERCIAL) AVANT
 *   tout appel au backend (401/403 sinon).
 * - Le navigateur ne voit JAMAIS le backend ni son jeton : ce module appelle
 *   `/internal/commercial/*` (serveur-à-serveur, en-tête `X-Internal-Token`).
 * - `actor_id` (POST/PATCH) est TOUJOURS l'utilisateur de la session
 *   courante, jamais une valeur envoyée par le client — sinon n'importe
 *   quel commercial pourrait journaliser une action au nom d'un autre.
 * - Les erreurs internes ne fuient jamais (502 générique).
 */

const NO_STORE = { 'Cache-Control': 'no-store' };
const TIMEOUT_MS = 20_000;
const ALLOWED_LIST_PARAMS = ['filter', 'sort', 'limit', 'offset', 'q', 'role'] as const;

function backendConfig(): { base: string; token: string } | null {
  const base = process.env.LADINI_BACKEND_URL;
  const token = process.env.INTERNAL_API_TOKEN;
  if (!base || !token) return null;
  return { base: base.replace(/\/$/, ''), token };
}

async function forward(url: string, token: string, init?: RequestInit): Promise<Response> {
  try {
    const upstream = await fetch(url, {
      ...init,
      headers: { ...(init?.headers || {}), 'X-Internal-Token': token, Accept: 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: 'no-store',
    });
    let body: unknown = null;
    try { body = await upstream.json(); } catch { /* corps non JSON */ }
    if (upstream.ok) return NextResponse.json(body, { headers: NO_STORE });
    if ([400, 404, 409].includes(upstream.status)) {
      const detail = (body as { detail?: string } | null)?.detail || 'Requête invalide.';
      return NextResponse.json({ error: detail }, { status: upstream.status, headers: NO_STORE });
    }
    console.error('[commercial] backend a répondu', upstream.status);
    return NextResponse.json({ error: 'Le service commercial est momentanément indisponible.' }, { status: 502, headers: NO_STORE });
  } catch (e) {
    console.error('[commercial] appel backend en échec', (e as Error).name);
    return NextResponse.json({ error: 'Le service commercial est momentanément indisponible.' }, { status: 502, headers: NO_STORE });
  }
}

export async function commercialListProxy(req: NextRequest): Promise<Response> {
  const { error } = await requireCommercial(req);
  if (error) return error;
  const cfg = backendConfig();
  if (!cfg) return NextResponse.json({ error: 'Espace Commercial indisponible (configuration serveur).' }, { status: 503, headers: NO_STORE });

  const source = new URL(req.url).searchParams;
  const q = new URLSearchParams();
  for (const key of ALLOWED_LIST_PARAMS) {
    const v = source.get(key);
    if (v !== null && v !== '') q.set(key, v.slice(0, 40));
  }
  const qs = q.toString();
  return forward(`${cfg.base}/internal/commercial/conversations${qs ? `?${qs}` : ''}`, cfg.token);
}

export async function commercialDetailProxy(req: NextRequest, userId: string): Promise<Response> {
  const { error } = await requireCommercial(req);
  if (error) return error;
  const cfg = backendConfig();
  if (!cfg) return NextResponse.json({ error: 'Espace Commercial indisponible (configuration serveur).' }, { status: 503, headers: NO_STORE });
  return forward(`${cfg.base}/internal/commercial/conversations/${encodeURIComponent(userId)}`, cfg.token);
}

export async function commercialFollowUpProxy(req: NextRequest, userId: string): Promise<Response> {
  const { user, error } = await requireCommercial(req);
  if (error || !user) return error!;
  const cfg = backendConfig();
  if (!cfg) return NextResponse.json({ error: 'Espace Commercial indisponible (configuration serveur).' }, { status: 503, headers: NO_STORE });

  let payload: { message?: unknown };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide.' }, { status: 400, headers: NO_STORE });
  }
  const message = typeof payload.message === 'string' ? payload.message : '';
  return forward(`${cfg.base}/internal/commercial/conversations/${encodeURIComponent(userId)}/follow-up`, cfg.token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ actor_id: user.id, message }),
  });
}

export async function commercialStatusProxy(req: NextRequest, userId: string): Promise<Response> {
  const { user, error } = await requireCommercial(req);
  if (error || !user) return error!;
  const cfg = backendConfig();
  if (!cfg) return NextResponse.json({ error: 'Espace Commercial indisponible (configuration serveur).' }, { status: 503, headers: NO_STORE });

  let payload: { status?: unknown; assigned_commercial_id?: unknown };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide.' }, { status: 400, headers: NO_STORE });
  }
  const status = typeof payload.status === 'string' ? payload.status : '';
  const assignedCommercialId = typeof payload.assigned_commercial_id === 'string' ? payload.assigned_commercial_id : undefined;
  return forward(`${cfg.base}/internal/commercial/conversations/${encodeURIComponent(userId)}/status`, cfg.token, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ actor_id: user.id, status, assigned_commercial_id: assignedCommercialId }),
  });
}
