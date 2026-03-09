import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/session';
import { fetchMeServer } from '@/app/actions/me.server';

export async function GET(req: Request) {
  try {
    const session = await getSessionFromRequest(req as any);
    if (!session?.userId) return NextResponse.json({ success: false, error: 'Authentification requise' }, { status: 401 });

    const data = await fetchMeServer(String(session.userId));
    if (process.env.NODE_ENV !== 'production') {
      try {
        console.debug('[api/me] session.userId=', session.userId);
        console.debug('[api/me] fetchMeServer returned user id=', data?.user?.id);
      } catch (e) {
        // ignore logging errors
      }
    }

    return NextResponse.json(data, {
      status: 200,
      headers: { 'Cache-Control': 'no-store, max-age=0' }
    });
  } catch (err: any) {
    if (err instanceof Error && err.message === 'USER_NOT_FOUND') {
      return NextResponse.json({ success: false, error: 'Utilisateur introuvable.' }, { status: 401 });
    }
    console.error('[api/me] Error:', err);
    return NextResponse.json({ success: false, error: 'Erreur serveur interne.' }, { status: 500 });
  }
}