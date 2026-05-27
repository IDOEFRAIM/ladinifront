import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-guard';
import { verifyBuyerProfile, getPendingBuyerVerifications, revokeBuyerTrustBadge } from '@/services/buyerVerification.service';

export async function GET() {
  const { user, error: authError } = await requireAdmin();
  if (authError) return authError;

  try {
    const pending = await getPendingBuyerVerifications();
    return NextResponse.json(pending);
  } catch (error) {
    console.error('[buyer-verification] GET error:', (error as Error).message);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { user, error: authError } = await requireAdmin();
  if (authError || !user) return authError ?? NextResponse.json({ error: 'Non autorisé' }, { status: 403 });

  try {
    const body = await req.json();
    const { buyerProfileId, verificationType, action: bodyAction } = body;

    if (!buyerProfileId) {
      return NextResponse.json({ error: 'buyerProfileId requis' }, { status: 400 });
    }

    let result;

    if (bodyAction === 'revoke') {
      result = await revokeBuyerTrustBadge(buyerProfileId, user.id);
    } else {
      if (!verificationType) {
        return NextResponse.json({ error: 'verificationType requis (CNIB ou COMMERCE_REGISTER)' }, { status: 400 });
      }
      result = await verifyBuyerProfile({
        buyerProfileId,
        adminUserId: user.id,
        verificationType,
      });
    }

    if (!result.success) {
      return NextResponse.json({ error: 'error' in result ? result.error : 'Erreur' }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('[buyer-verification] POST error:', (error as Error).message);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
