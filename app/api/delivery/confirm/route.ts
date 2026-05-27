import { NextRequest, NextResponse } from 'next/server';
import { getAccessContext } from '@/lib/api-guard';
import { confirmDeliveryWithOTP } from '@/services/delivery.service';

/**
 * POST /api/delivery/confirm
 * Preuve de livraison par OTP.
 * Body: { deliveryId: string, otpCode: string }
 */
export async function POST(req: NextRequest) {
  const { ctx, error } = await getAccessContext(['AGENT', 'ADMIN', 'SUPERADMIN']);
  if (error) return error;

  try {
    const body = await req.json();
    if (!body.deliveryId || !body.otpCode) {
      return NextResponse.json({ error: 'deliveryId et otpCode requis' }, { status: 400 });
    }

    const result = await confirmDeliveryWithOTP({
      deliveryId: body.deliveryId,
      userId: ctx!.userId,
      otpCode: body.otpCode,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('[delivery/confirm] error:', (error as Error).message);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
