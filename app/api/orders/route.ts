import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { OrderSchema } from '@/lib/validators';
import { createOrderService } from '@/features/orders/services/orders.service';
import { requireProducer } from '@/lib/api-guard';
import { getSessionFromRequest } from '@/lib/session';
import { asError } from '@/lib/errors';

const MAX_AUDIO_SIZE = 5 * 1024 * 1024; // 5 MB

// GET — producer orders (delegates to server action)
export async function GET(req: NextRequest) {
  try {
    const { user, error } = await requireProducer(req);
    if (error || !user) return error!;

    const { fetchProducerOrders } = await import('@/features/orders/services/order-form.service');
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
    const session = await getSessionFromRequest(req);
    const buyerId = session?.userId;
    if (!buyerId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

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
    const { createOrderFromForm } = await import('@/features/orders/services/order-form.service');
    const result = await createOrderFromForm(formData, buyerId);
    return NextResponse.json({ success: true, orderId: result.orderId }, { status: 201 });
  } catch (_error: unknown) {
    const error = asError(_error);
    console.error('POST /api/orders Error:', error);
    return NextResponse.json({ error: error?.message || 'Erreur serveur' }, { status: 500 });
  }
}
