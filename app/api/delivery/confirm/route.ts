import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/session';
import { confirmDeliveryWithOTP } from '@/services/delivery.service';

/**
 * POST /api/delivery/confirm
 * Preuve de livraison par OTP.
 * Body: { deliveryId: string, otpCode: string }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req as any);
    if (!session?.userId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await req.json();
    if (!body.deliveryId || !body.otpCode) {
      return NextResponse.json({ error: 'deliveryId et otpCode requis' }, { status: 400 });
    }

    const result = await confirmDeliveryWithOTP({
      deliveryId: body.deliveryId,
      userId: session.userId,
      otpCode: body.otpCode,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('POST /api/delivery/confirm error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
