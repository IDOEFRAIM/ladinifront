import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/session';
import { updateUserZoneAction } from '@/features/organization/services/org-selection.service';
import { asError } from '@/lib/errors';

export async function POST(req: Request) {
  try {
    const session = await getSessionFromRequest(req);
    if (!session?.userId) return NextResponse.json({ error: 'Authentification requise' }, { status: 401 });

    const body = await req.json();
    const zoneId = body?.zoneId;
    if (!zoneId) return NextResponse.json({ error: 'zoneId requis' }, { status: 400 });

    const res = await updateUserZoneAction(session.userId, zoneId);
    if (!res.success) return NextResponse.json({ error: 'Zone introuvable' }, { status: 404 });

    return NextResponse.json({ ok: true, zoneId });
  } catch (_err: unknown) {
    const err = asError(_err);
    console.error('[api/user/zone] error', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
