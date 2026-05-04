import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/session';
import { verifyBuyerProfile, getPendingBuyerVerifications, revokeBuyerTrustBadge } from '@/services/buyerVerification.service';

/**
 * GET /api/admin/buyer-verification
 * Liste les profils acheteurs en attente de vérification.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req as any);
    if (!session?.userId || !['ADMIN', 'SUPERADMIN'].includes(session.role || '')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    const pending = await getPendingBuyerVerifications();
    return NextResponse.json(pending);
  } catch (error: any) {
    console.error('GET /api/admin/buyer-verification error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * POST /api/admin/buyer-verification
 * Vérifie ou révoque le badge de confiance d'un acheteur.
 * Body: { buyerProfileId: string, verificationType: 'CNIB' | 'COMMERCE_REGISTER', action?: 'verify' | 'revoke' }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromRequest(req as any);
    if (!session?.userId || !['ADMIN', 'SUPERADMIN'].includes(session.role || '')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    const body = await req.json();
    const { buyerProfileId, verificationType, action: bodyAction } = body;

    if (!buyerProfileId) {
      return NextResponse.json({ error: 'buyerProfileId requis' }, { status: 400 });
    }

    let result;

    if (bodyAction === 'revoke') {
      result = await revokeBuyerTrustBadge(buyerProfileId, session.userId);
    } else {
      if (!verificationType) {
        return NextResponse.json({ error: 'verificationType requis (CNIB ou COMMERCE_REGISTER)' }, { status: 400 });
      }
      result = await verifyBuyerProfile({
        buyerProfileId,
        adminUserId: session.userId,
        verificationType,
      });
    }

    if (!result.success) {
      return NextResponse.json({ error: (result as any).error || 'Erreur' }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('POST /api/admin/buyer-verification error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
