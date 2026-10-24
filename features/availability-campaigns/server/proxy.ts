import { NextResponse, type NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/api-guard';

/**
 * Adaptateur serveur de la console CAMPAGNES DE DISPONIBILITÉS (diffusion proactive WhatsApp).
 * Même schéma que `features/commercial/server/proxy.ts` :
 *
 * - Auth : `requireAdmin` (session ADMIN/SUPERADMIN) AVANT tout appel au backend (401/403 sinon).
 * - Le navigateur ne voit JAMAIS le backend ni son jeton : ce module appelle `/internal/availability-campaigns/*`
 *   (serveur-à-serveur, en-tête `X-Internal-Token`).
 * - `actor_id` des écritures est TOUJOURS l'administrateur de la session, jamais une valeur envoyée par le client
 *   (le backend re-vérifie en base qu'il est ADMIN et audite l'action).
 * - Les identifiants de chemin sont validés (UUID) : aucune injection de chemin vers le backend.
 * - Les erreurs internes ne fuient jamais (502 générique) ; seuls les refus métier (400/403/404/409/422) transmettent leur message.
 * - Ni corps de requête, ni numéros de téléphone ne sont journalisés.
 */

const NO_STORE = { 'Cache-Control': 'no-store' };
const TIMEOUT_MS = 20_000;
const BASE_PATH = '/internal/availability-campaigns';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PASS_THROUGH_STATUSES = [400, 403, 404, 409, 422];
const UNAVAILABLE = 'Le service de campagnes est momentanément indisponible.';

type AdminUser = { id: string };

function backendConfig(): { base: string; token: string } | null {
  const base = process.env.LADINI_BACKEND_URL;
  const token = process.env.INTERNAL_API_TOKEN;
  if (!base || !token) return null;
  return { base: base.replace(/\/$/, ''), token };
}

function json(body: unknown, status: number): Response {
  return NextResponse.json(body, { status, headers: NO_STORE });
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
    if (PASS_THROUGH_STATUSES.includes(upstream.status)) {
      const detail = (body as { detail?: unknown } | null)?.detail;
      return json({ error: typeof detail === 'string' && detail ? detail : 'Requête invalide.' }, upstream.status);
    }
    console.error('[campaigns] backend a répondu', upstream.status);
    return json({ error: UNAVAILABLE }, 502);
  } catch (e) {
    console.error('[campaigns] appel backend en échec', (e as Error).name);
    return json({ error: UNAVAILABLE }, 502);
  }
}

/** Auth + configuration, puis `run(user, cfg)`. Un identifiant de campagne éventuel est validé avant tout appel. */
async function guarded(
  req: NextRequest,
  campaignId: string | null,
  run: (user: AdminUser, cfg: { base: string; token: string }) => Promise<Response>,
): Promise<Response> {
  const { user, error } = await requireAdmin(req);
  if (error || !user) return error!;
  if (campaignId !== null && !UUID_RE.test(campaignId)) return json({ error: 'Identifiant de campagne invalide.' }, 400);
  const cfg = backendConfig();
  if (!cfg) return json({ error: 'Console campagnes indisponible (configuration serveur).' }, 503);
  return run({ id: user.id }, cfg);
}

async function readObjectBody(req: NextRequest): Promise<Record<string, unknown> | null> {
  try {
    const body = await req.json();
    return body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function pickQuery(req: NextRequest, allowed: readonly string[]): string {
  const source = new URL(req.url).searchParams;
  const q = new URLSearchParams();
  for (const key of allowed) {
    const v = source.get(key);
    if (v !== null && v !== '') q.set(key, v.slice(0, 40));
  }
  const qs = q.toString();
  return qs ? `?${qs}` : '';
}

/** Écriture : corps JSON objet obligatoire, `actor_id` forcé à la session. */
async function write(req: NextRequest, campaignId: string | null, path: string, method: 'POST' | 'PATCH'): Promise<Response> {
  return guarded(req, campaignId, async (user, cfg) => {
    const body = await readObjectBody(req);
    if (!body) return json({ error: 'Corps de requête invalide.' }, 400);
    return forward(`${cfg.base}${BASE_PATH}${path}`, cfg.token, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, actor_id: user.id }),
    });
  });
}

async function read(req: NextRequest, campaignId: string | null, path: string, allowedQuery: readonly string[] = []): Promise<Response> {
  return guarded(req, campaignId, (_user, cfg) => forward(`${cfg.base}${BASE_PATH}${path}${pickQuery(req, allowedQuery)}`, cfg.token));
}

const enc = encodeURIComponent;

export const listCampaigns = (req: NextRequest) => read(req, null, '/campaigns', ['status', 'limit', 'offset']);
export const createCampaign = (req: NextRequest) => write(req, null, '/campaigns', 'POST');
export const campaignDetail = (req: NextRequest, id: string) => read(req, id, `/campaigns/${enc(id)}`);
export const updateCampaign = (req: NextRequest, id: string) => write(req, id, `/campaigns/${enc(id)}`, 'PATCH');
export const campaignPreview = (req: NextRequest, id: string) => read(req, id, `/campaigns/${enc(id)}/preview`);
export const validateCampaign = (req: NextRequest, id: string) => write(req, id, `/campaigns/${enc(id)}/validate`, 'POST');
export const cancelCampaign = (req: NextRequest, id: string) => write(req, id, `/campaigns/${enc(id)}/cancel`, 'POST');
export const campaignRecipients = (req: NextRequest, id: string) => read(req, id, `/campaigns/${enc(id)}/recipients`, ['status', 'limit', 'offset']);
export const campaignResults = (req: NextRequest, id: string) => read(req, id, `/campaigns/${enc(id)}/results`);
export const eligibleOffers = (req: NextRequest) => write(req, null, '/offers/eligible', 'POST');
export const importConsents = (req: NextRequest) => write(req, null, '/consents/import', 'POST');
export const requestConsents = (req: NextRequest) => write(req, null, '/consents/request', 'POST');
