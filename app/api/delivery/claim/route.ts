import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/session';
import { claimDelivery } from '@/services/delivery.service';

/**
 * POST /api/delivery/claim
 * Un transporteur accepte une livraison.
 * Body: { deliveryId: string }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req as any);
    if (!session?.userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await req.json();
    if (!body.deliveryId) {
      return NextResponse.json({ error: 'deliveryId requis' }, { status: 400 });
    }

    const result = await claimDelivery(body.deliveryId, session.userId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 409 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('POST /api/delivery/claim error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
