import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/session';
import { verifySeedDistributionCode } from '@/services/seedDistribution.service';

export async function POST(req: Request) {
  const body = await req.json();
  const { distributionId, code, ipAddress } = body;
  if (!distributionId || !code) return NextResponse.json({ error: 'missing' }, { status: 400 });

  const session = await getSessionFromRequest(req as any);
  if (!session || !session.userId) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });

  try {
    const result = await verifySeedDistributionCode(session.userId, distributionId, String(code), ipAddress);
    return NextResponse.json({ ok: true, ...result });
  } catch (e: any) {
    const msg = String(e?.message || 'server_error');
    if (msg.toLowerCase().includes('introuvable')) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    if (msg.toLowerCase().includes('expir')) return NextResponse.json({ error: 'expired' }, { status: 400 });
    if (msg.toLowerCase().includes('invalide')) return NextResponse.json({ ok: false, error: 'invalid_code' }, { status: 400 });
    if (msg.toLowerCase().includes('accès') || msg.toLowerCase().includes('refus')) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    if (msg.toLowerCase().includes('stock')) return NextResponse.json({ error: 'insufficient_stock' }, { status: 409 });
    console.error('inventory/verify failed', e);
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}
