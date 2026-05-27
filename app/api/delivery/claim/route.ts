import { NextRequest, NextResponse } from 'next/server';
import { getAccessContext } from '@/lib/api-guard';
import { claimDelivery } from '@/services/delivery.service';

/**
 * POST /api/delivery/claim
 * Un transporteur accepte une livraison.
 * Body: { deliveryId: string }
 */
export async function POST(req: NextRequest) {
  const { ctx, error } = await getAccessContext(['AGENT', 'ADMIN', 'SUPERADMIN']);
  if (error) return error;

  try {
    const body = await req.json();
    if (!body.deliveryId) {
      return NextResponse.json({ error: 'deliveryId requis' }, { status: 400 });
    }

    const result = await claimDelivery(body.deliveryId, ctx!.userId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 409 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('[delivery/claim] error:', (error as Error).message);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
