import { NextRequest, NextResponse } from 'next/server';
import { convertMaturedPreorders } from '@/services/preorder.service';

export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 503 });
  }
  const headerSecret =
    req.headers.get('x-cron-secret') || req.headers.get('authorization')?.replace('Bearer ', '');
  if (headerSecret !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await convertMaturedPreorders();
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json(result.data);
}

export async function GET(req: NextRequest) {
  return POST(req);
}
