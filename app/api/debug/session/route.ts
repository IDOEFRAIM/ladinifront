import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/session';

export async function GET(req: Request) {
  // Only allow in dev and from localhost to avoid exposing tokens in prod
  if (process.env.NODE_ENV !== 'development') return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
  const url = new URL(req.url);
  const allowLocal = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  if (!allowLocal) return NextResponse.json({ error: 'Not allowed' }, { status: 403 });

  const session = await getSessionFromRequest(req as any);
  return NextResponse.json({ session: session ?? null });
}
