import { NextResponse } from 'next/server';
import { getAccessContext } from '@/lib/api-guard';
import { getAvailableDeliveries } from '@/services/delivery.service';

export async function GET() {
  const { ctx, error } = await getAccessContext(['AGENT', 'ADMIN', 'SUPERADMIN']);
  if (error) return error;

  try {
    const deliveries = await getAvailableDeliveries(ctx!.userId);
    return NextResponse.json(deliveries);
  } catch (e) {
    console.error('[delivery/available] error:', (e as Error).message);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
