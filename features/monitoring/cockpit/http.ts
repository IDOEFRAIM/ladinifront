import { NextResponse, type NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/api-guard';
import { BadPeriodError, resolvePeriod, resolvePage, type Period } from './period';
import { getThresholds, type Thresholds } from './thresholds';

export interface CockpitRequest {
  url: URL;
  period: Period;
  page: { limit: number; offset: number };
  thresholds: Thresholds;
}

/** Filtre texte sûr (identifiants métier : intent, workflow, outil, rôle) — jamais interpolé, mais borné pour éviter les abus. */
export const SAFE_TOKEN = /^[A-Za-z0-9_.\- ]{1,80}$/;
export function safeToken(v: string | null): string | undefined {
  if (!v) return undefined;
  if (!SAFE_TOKEN.test(v)) throw new BadPeriodError('paramètre de filtre invalide');
  return v;
}
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Enveloppe commune des endpoints du cockpit :
 *  - accès ADMIN / SUPERADMIN uniquement (401/403 sinon, avant toute lecture de base) ;
 *  - période + pagination validées (400 explicite) ;
 *  - erreurs internes : 500 générique, détail jamais exposé ; réponses `no-store`.
 */
export async function adminEndpoint(req: NextRequest, handler: (r: CockpitRequest) => Promise<unknown>): Promise<Response> {
  const { error } = await requireAdmin(req);
  if (error) return error;
  try {
    const url = new URL(req.url);
    const period = resolvePeriod(url.searchParams);
    const page = resolvePage(url.searchParams);
    const data = await handler({ url, period, page, thresholds: getThresholds() });
    if (data === null) return NextResponse.json({ error: 'Introuvable.' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    if (e instanceof BadPeriodError) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error('[monitoring] erreur endpoint', e);
    return NextResponse.json({ error: 'Erreur lors du chargement des données de monitoring.' }, { status: 500 });
  }
}
