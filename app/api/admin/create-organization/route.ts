import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/api-guard';
import { asError } from '@/lib/errors';

export async function POST(req: NextRequest) {
  const { error: authError } = await requireAdmin();
  if (authError) return authError;

  try {
    const body = await req.json();
    const { name, type, taxId, description } = body || {};
    const { createOrganization } = await import('@/features/admin/services/admin-organizations.service');
    const res = await createOrganization({ name, type, taxId: taxId ?? null, description: description ?? null });
    if (!res.success) {
      return NextResponse.json({ success: false, error: res.error }, { status: 400 });
    }
    return NextResponse.json({ success: true, data: res.data }, { status: 201 });
  } catch (_err: unknown) {
    const err = asError(_err);
    console.error('[API] create-organization error', err);
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}
