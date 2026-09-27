import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSessionFromRequest } from '@/lib/session';
import { fetchMeServer } from '@/features/auth/services/me.service';
import { fail } from '@/lib/api-result';
import { dbErrorResponse } from '@/lib/db-http';
import { classifyDbError } from '@/lib/db-errors';

/**
 * GET /api/me
 *  - 401 : pas de session, ou utilisateur inconnu
 *  - 503 + Retry-After : base temporairement indisponible (connexion, timeout, surcharge) — JAMAIS 500
 *  - 500 : vraie erreur logique, non masquée
 * Aucune requête de repli : rejouer une requête plus lourde sur une base déjà en difficulté aggraverait l'incident.
 */
export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const session =
      (await getSessionFromRequest({ cookies: cookieStore })) ||
      (await getSessionFromRequest(req));

    if (!session?.userId) {
      return NextResponse.json(fail('Authentification requise'), { status: 401 });
    }

    const result = await fetchMeServer(String(session.userId));
    if (result.success) {
      return NextResponse.json(result, {
        status: 200,
        headers: { 'Cache-Control': 'no-store, max-age=0' },
      });
    }
    return NextResponse.json(fail('Utilisateur introuvable.'), { status: 401 });
  } catch (err) {
    if (classifyDbError(err).errorClass === 'not_found') {
      return NextResponse.json(fail('Utilisateur introuvable.'), { status: 401 });
    }
    return dbErrorResponse(err, 'api/me');
  }
}
