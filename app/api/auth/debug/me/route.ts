import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/session';
import { buildAccessContext } from '@/lib/access-context';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const session = await getSessionFromRequest(req as any);
    if (!session?.userId) {
      return NextResponse.json({ success: false, error: 'no-session' }, { status: 401 });
    }

    // Attempt to build access context and fetch user profile
    const ctx = await buildAccessContext(session.userId);
    const userProfile = await prisma.user.findUnique({ where: { id: session.userId }, select: { name: true, email: true } });
    if (!userProfile) return NextResponse.json({ success: false, error: 'USER_NOT_FOUND' }, { status: 401 });

    return NextResponse.json({ success: true, debug: { session, ctx, userProfile } });
  } catch (err: any) {
    // Return error message and stack for local debugging (remove in prod)
    return NextResponse.json({ success: false, error: String(err), stack: err?.stack ?? null }, { status: 500 });
  }
}
