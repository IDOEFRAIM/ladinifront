import { NextRequest, NextResponse } from 'next/server';
import { getAccessContext } from '@/lib/api-guard';
export async function GET(req: NextRequest) {
  try {
    const { ctx, error } = await getAccessContext(undefined, ['ORGANIZATION_MANAGE']);
    if (error) return error;

    const { fetchOrganizations } = await import('@/app/actions/admin.server');
    const orgs = await fetchOrganizations();
    return NextResponse.json({ success: true, data: orgs });
  } catch (err) {
    console.error('[API] admin/organizations GET error', err);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
