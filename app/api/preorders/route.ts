import { NextRequest, NextResponse } from 'next/server';
import { getAccessContext } from '@/lib/api-guard';
import { createPreorder, getBuyerPreorders } from '@/services/preorder.service';

export async function GET() {
  const { ctx, error } = await getAccessContext(['BUYER', 'ADMIN', 'SUPERADMIN']);
  if (error) return error;

  const result = await getBuyerPreorders(ctx!.userId);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result.data);
}

export async function POST(req: NextRequest) {
  const { ctx, error } = await getAccessContext(['BUYER', 'ADMIN', 'SUPERADMIN']);
  if (error) return error;

  try {
    const body = await req.json();
    const result = await createPreorder(ctx!.userId, body);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json(result.data, { status: 201 });
  } catch (e) {
    console.error('[preorders] POST error:', (e as Error).message);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
