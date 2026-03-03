import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAccessContext } from '@/lib/api-guard';

export async function GET(req: NextRequest) {
  try {
    const { ctx, error } = await getAccessContext(undefined, ['ORGANIZATION_MANAGE']);
    if (error) return error;

    // Some dev databases may not have the `status` column yet (migration pending).
    // Attempt to select status, but fall back to selecting without it to avoid P2022 errors.
    let orgs;
    try {
      orgs = await prisma.organization.findMany({ orderBy: { createdAt: 'desc' }, select: { id: true, name: true, type: true, createdAt: true, status: true } });
    } catch (e: any) {
      console.warn('[API] admin/organizations: could not select `status`, falling back', e?.message || e);
      orgs = await prisma.organization.findMany({ orderBy: { createdAt: 'desc' }, select: { id: true, name: true, type: true, createdAt: true } });
      // map to include a default status for consumers
      orgs = orgs.map((o: any) => ({ ...o, status: 'UNKNOWN' }));
    }
    return NextResponse.json({ success: true, data: orgs });
  } catch (err) {
    console.error('[API] admin/organizations GET error', err);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
