import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/session';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const session = await getSessionFromRequest(req as any).catch(() => null);
    const userId = session?.userId;

    const { traceAction } = await import('@/app/actions/agri.server');
    const res = await traceAction(body, String(userId));

    return NextResponse.json(res);
  } catch (err) {
    console.error('POST /api/agri/trace error', err);
    return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 });
  }
}
