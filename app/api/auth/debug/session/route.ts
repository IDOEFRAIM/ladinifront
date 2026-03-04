import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/session';

export async function GET(req: Request) {
  try {
    const payload = await getSessionFromRequest(req as any);
    // Return only safe fields from the payload for diagnostics
    if (!payload) {
      return NextResponse.json({ hasPayload: false, payload: null });
    }
    return NextResponse.json({
      hasPayload: true,
      payload: {
        userId: payload.userId,
        role: payload.role ?? null,
        permissionVersion: payload.permissionVersion ?? null,
        activeOrgId: payload.activeOrgId ?? null,
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
