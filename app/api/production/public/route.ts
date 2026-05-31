import { NextRequest, NextResponse } from 'next/server';
import { getPublicFutureProductions } from '@/services/production.service';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const subCategoryId = url.searchParams.get('subCategoryId') || undefined;
    const zoneId = url.searchParams.get('zoneId') || undefined;
    const availableFromRaw = url.searchParams.get('availableFrom');
    const limitRaw = url.searchParams.get('limit');

    const result = await getPublicFutureProductions({
      subCategoryId,
      zoneId,
      availableFrom: availableFromRaw ? new Date(availableFromRaw) : undefined,
      limit: limitRaw ? Number(limitRaw) : undefined,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result.data);
  } catch (error) {
    console.error('[production/public] error:', (error as Error).message);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
