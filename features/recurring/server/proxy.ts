import { NextResponse, type NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/api-guard';

/**
 * Adaptateur serveur « Recurring — Operations » (liste/fiche des besoins récurrents + réglage du délai avant
 * première livraison). Même schéma que `features/commercial/server/proxy.ts` :
 *
 * - Auth : `requireAdmin` (ADMIN/SUPERADMIN) AVANT tout appel au backend — 401/403 sinon.
 * - Le navigateur ne voit JAMAIS le backend ni son jeton : appel serveur-à-serveur sur
 *   `/internal/recurring-admin/*` avec `X-Internal-Token`.
 * - `actor_id` (écriture du réglage) est TOUJOURS l'utilisateur de la session, jamais une valeur envoyée par le client.
 *   Le backend re-vérifie en base que cet acteur est ADMIN (défense en profondeur).
 * - Aucune route d'écriture sur un besoin : toute mutation d'un besoin passe par le service métier, jamais la console.
 * - Les erreurs internes ne fuient jamais (502 générique) ; les erreurs métier (400/403/404/409/422) gardent leur message.
 *
 * OPERATIONS (ici) ≠ ANALYTICS (`features/analytics`) : l'une inspecte UN objet réel, l'autre agrège.
 */

const NO_STORE = { 'Cache-Control': 'no-store' };
const TIMEOUT_MS = 20_000;
const ALLOWED_LIST_PARAMS = [
  'status', 'product', 'region', 'frequency', 'buyer', 'q',
  'starts_from', 'starts_to', 'next_from', 'next_to', 'limit', 'offset',
] as const;
const PASS_THROUGH_ERRORS = [400, 403, 404, 409, 422];
const UNAVAILABLE = 'Le service Recurring est momentanément indisponible.';
const ROUTE_MISSING = "Console Recurring indisponible : le backend contacté n'expose pas encore /internal/recurring-admin (version à déployer).";

function backendConfig(): { base: string; token: string } | null {
  const base = process.env.LADINI_BACKEND_URL;
  const token = process.env.INTERNAL_API_TOKEN;
  if (!base || !token) return null;
  return { base: base.replace(/\/$/, ''), token };
}

const notConfigured = () =>
  NextResponse.json({ error: 'Console Recurring indisponible (configuration serveur).' }, { status: 503, headers: NO_STORE });

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
    // 404 SANS message métier = la ROUTE n'existe pas sur ce backend (version non déployée), pas « besoin introuvable »
    // (le backend répond `Besoin introuvable.` dans ce cas-là). On le dit clairement plutôt qu'un « Requête invalide ».
    if (upstream.status === 404) {
      const detail = (body as { detail?: string } | null)?.detail;
      if (!detail || detail === 'Not Found') {
        return NextResponse.json({ error: ROUTE_MISSING }, { status: 503, headers: NO_STORE });
      }
    }
    if (PASS_THROUGH_ERRORS.includes(upstream.status)) {
      const detail = (body as { detail?: string } | null)?.detail || 'Requête invalide.';
      return NextResponse.json({ error: detail }, { status: upstream.status, headers: NO_STORE });
    }
    console.error('[recurring-admin] backend a répondu', upstream.status);
    return NextResponse.json({ error: UNAVAILABLE }, { status: 502, headers: NO_STORE });
  } catch (e) {
    console.error('[recurring-admin] appel backend en échec', (e as Error).name);
    return NextResponse.json({ error: UNAVAILABLE }, { status: 502, headers: NO_STORE });
  }
}

export async function recurringSettingsGetProxy(req: NextRequest): Promise<Response> {
  const { error } = await requireAdmin(req);
  if (error) return error;
  const cfg = backendConfig();
  if (!cfg) return notConfigured();
  return forward(`${cfg.base}/internal/recurring-admin/settings`, cfg.token);
}

export async function recurringSettingsPutProxy(req: NextRequest): Promise<Response> {
  const { user, error } = await requireAdmin(req);
  if (error || !user) return error!;
  const cfg = backendConfig();
  if (!cfg) return notConfigured();

  let payload: { minimum_start_lead_days?: unknown; expected_version?: unknown };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Corps de requête invalide.' }, { status: 400, headers: NO_STORE });
  }
  if (!payload || typeof payload !== 'object') {
    return NextResponse.json({ error: 'Corps de requête invalide.' }, { status: 400, headers: NO_STORE });
  }
  // La VALEUR n'est pas filtrée ici (le backend la valide : entier 0..30) ; seul son type brut est transmis tel quel
  // pour que « 2.5 », « "4" » ou un booléen soient refusés par la source de vérité, jamais « corrigés » en silence.
  const expected = typeof payload.expected_version === 'number' ? payload.expected_version : undefined;
  return forward(`${cfg.base}/internal/recurring-admin/settings`, cfg.token, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      actor_id: user.id,
      minimum_start_lead_days: payload.minimum_start_lead_days,
      expected_version: expected,
    }),
  });
}

export async function recurringNeedsListProxy(req: NextRequest): Promise<Response> {
  const { error } = await requireAdmin(req);
  if (error) return error;
  const cfg = backendConfig();
  if (!cfg) return notConfigured();

  const source = new URL(req.url).searchParams;
  const q = new URLSearchParams();
  for (const key of ALLOWED_LIST_PARAMS) {
    const v = source.get(key);
    if (v !== null && v !== '') q.set(key, v.slice(0, 80));
  }
  const qs = q.toString();
  return forward(`${cfg.base}/internal/recurring-admin/needs${qs ? `?${qs}` : ''}`, cfg.token);
}

export async function recurringNeedDetailProxy(req: NextRequest, needId: string): Promise<Response> {
  const { error } = await requireAdmin(req);
  if (error) return error;
  const cfg = backendConfig();
  if (!cfg) return notConfigured();
  return forward(`${cfg.base}/internal/recurring-admin/needs/${encodeURIComponent(needId)}`, cfg.token);
}
