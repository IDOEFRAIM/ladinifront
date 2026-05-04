import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/session';
import { getOrderTrackingTimeline } from '@/services/buyer.service';

/**
 * GET /api/buyer/tracking/[orderId]
 * Suivi chronologique complet d'une commande (timeline + livraison + agent).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const session = await getSessionFromRequest(req as any);
    if (!session?.userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { orderId } = await params;
    if (!orderId) {
      return NextResponse.json({ error: 'orderId requis' }, { status: 400 });
    }

    const tracking = await getOrderTrackingTimeline(orderId, session.userId);

    if (!tracking) {
      return NextResponse.json({ error: 'Commande introuvable ou non autorisée' }, { status: 404 });
    }

    return NextResponse.json(tracking);
  } catch (error: any) {
    console.error('GET /api/buyer/tracking error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
