import { NextResponse } from 'next/server';
import { getAccessContext } from '@/lib/api-guard';
import { getOrderTrackingTimeline } from '@/services/buyer.service';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { ctx, error } = await getAccessContext(['BUYER', 'ADMIN', 'SUPERADMIN']);
  if (error) return error;

  try {
    const { orderId } = await params;
    if (!orderId) {
      return NextResponse.json({ error: 'orderId requis' }, { status: 400 });
    }

    const tracking = await getOrderTrackingTimeline(orderId, ctx!.userId);
    if (!tracking) {
      return NextResponse.json({ error: 'Commande introuvable ou non autorisée' }, { status: 404 });
    }

    return NextResponse.json(tracking);
  } catch (error) {
    console.error('[buyer/tracking] error:', (error as Error).message);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
