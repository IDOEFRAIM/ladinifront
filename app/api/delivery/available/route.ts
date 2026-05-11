import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/session';
import { getAvailableDeliveries } from '@/services/delivery.service';

/**
 * GET /api/delivery/available
 * Liste les livraisons disponibles pour le transporteur connecté.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req as any);
    if (!session?.userId) {
      console.log('no session buddy')
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const deliveries = await getAvailableDeliveries(session.userId);
    console.log('deliveries',deliveries)
    return NextResponse.json(deliveries);
  } catch (error: any) {
    console.error('GET /api/delivery/available error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
