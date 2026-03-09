import { NextRequest, NextResponse } from 'next/server';
import { getAccessContext } from '@/lib/api-guard';

export async function POST(req: NextRequest) {
  try {
    const { ctx, error } = await getAccessContext(['ADMIN', 'SUPERADMIN']);
    if (error) return error;
    if (!ctx) return NextResponse.json({ success: false, error: 'Accès refusé' }, { status: 403 });

    const body = await req.json();
    const { organizationId } = body || {};
    if (!organizationId) return NextResponse.json({ success: false, error: 'Bad Request' }, { status: 400 });

    const { approveOrganization } = await import('@/app/actions/admin.server');
    const updated = await approveOrganization(organizationId, ctx.userId);

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error('[API] admin/organizations/approve error', err);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
