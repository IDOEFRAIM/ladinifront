import { NextRequest, NextResponse } from 'next/server';
import { settleExpiredAuctions } from '@/services/auctionSettlement.service';

/**
 * POST /api/cron/settle-auctions
 * CRON endpoint : règle automatiquement les enchères expirées.
 *
 * Sécurité : protégé par un secret CRON_SECRET dans les headers.
 * Peut être appelé par :
 *   - Vercel Cron Jobs
 *   - GitHub Actions
 *   - Un service externe avec le bon header
 *
 * Header requis : x-cron-secret: <CRON_SECRET>
 */
export async function POST(req: NextRequest) {
  try {
    // Vérification du secret
    const cronSecret = process.env.CRON_SECRET;
    const headerSecret = req.headers.get('x-cron-secret');

    if (cronSecret && headerSecret !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await settleExpiredAuctions();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('POST /api/cron/settle-auctions error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// Also support GET for Vercel Cron compatibility
export async function GET(req: NextRequest) {
  return POST(req);
}
