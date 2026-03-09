import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { OrderSchema } from '@/lib/validators';
import { createOrderService } from '@/services/orders.service';
import { requireProducer } from '@/lib/api-guard';
import { getSessionFromRequest } from '@/lib/session';

const MAX_AUDIO_SIZE = 5 * 1024 * 1024; // 5 MB

// GET — producer orders (delegates to server action)
export async function GET(req: NextRequest) {
  try {
    const { user, error } = await requireProducer(req);
    if (error || !user) return error!;

    const { fetchProducerOrders } = await import('@/app/actions/orders.server');
    const orders = await fetchProducerOrders(user.id);
    return NextResponse.json(orders);
  } catch (error) {
    console.error('GET /api/orders Error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST — create order (keeps existing service-based flow)
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req as any);
    const buyerId = session?.userId;

    const formData = await req.formData();
    const rawData = formData.get('data') as string | null;
    const voiceFile = formData.get('voiceNote') as File | null;

    if (!rawData) return NextResponse.json({ error: 'Données manquantes' }, { status: 400 });

    let json: unknown;
    try {
      json = JSON.parse(rawData);
    } catch {
      return NextResponse.json({ error: 'Format de données invalide' }, { status: 400 });
    }

    const validation = OrderSchema.safeParse(json);
    if (!validation.success) {
      const errors = validation.error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      return NextResponse.json({ error: `Validation: ${errors}` }, { status: 400 });
    }

    const orderData = validation.data;

    // Delegate creation to server action which handles validation, audio and DB
    const { createOrderFromForm } = await import('@/app/actions/orders.server');
    const result = await createOrderFromForm(formData, buyerId || undefined);
    return NextResponse.json({ success: true, orderId: result.orderId }, { status: 201 });
  } catch (error: any) {
    console.error('POST /api/orders Error:', error);
    return NextResponse.json({ error: error?.message || 'Erreur serveur' }, { status: 500 });
  }
}
