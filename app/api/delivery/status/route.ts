import { NextRequest, NextResponse } from 'next/server';
import { getAccessContext } from '@/lib/api-guard';
import {
  markPickedUp,
  markDeliveryFailed,
  updateAgentStatus,
  getAgentDeliveryHistory,
} from '@/services/delivery.service';

type DeliveryAction = 'PICKUP' | 'FAILED' | 'GO_ONLINE' | 'GO_OFFLINE';

interface StatusRequestBody {
  action: DeliveryAction;
  deliveryId?: string;
  reason?: string;
}

export async function POST(req: NextRequest) {
  const { ctx, error } = await getAccessContext(['AGENT', 'ADMIN', 'SUPERADMIN']);
  if (error) return error;

  try {
    let body: StatusRequestBody;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'JSON malformé' }, { status: 400 });
    }

    const { action, deliveryId, reason } = body;
    let result;

    switch (action) {
      case 'PICKUP':
        if (!deliveryId) return NextResponse.json({ error: 'deliveryId requis' }, { status: 400 });
        result = await markPickedUp(deliveryId, ctx!.userId);
        break;
      case 'FAILED':
        if (!deliveryId) return NextResponse.json({ error: 'deliveryId requis' }, { status: 400 });
        result = await markDeliveryFailed(deliveryId, ctx!.userId, reason);
        break;
      case 'GO_ONLINE':
        result = await updateAgentStatus(ctx!.userId, 'AVAILABLE');
        break;
      case 'GO_OFFLINE':
        result = await updateAgentStatus(ctx!.userId, 'OFFLINE');
        break;
      default:
        return NextResponse.json({ error: 'Action invalide' }, { status: 400 });
    }

    if (!result || !result.success) {
      return NextResponse.json({ error: result?.error || 'Une erreur est survenue' }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('[delivery/status] POST error:', (error as Error).message);
    return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 });
  }
}

export async function GET() {
  const { ctx, error } = await getAccessContext(['AGENT', 'ADMIN', 'SUPERADMIN']);
  if (error) return error;

  try {
    const history = await getAgentDeliveryHistory(ctx!.userId);
    return NextResponse.json(history || []);
  } catch (error) {
    console.error('[delivery/status] GET error:', (error as Error).message);
    return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 });
  }
}
