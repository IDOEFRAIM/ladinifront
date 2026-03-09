import { NextRequest, NextResponse } from 'next/server';
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, type, taxId, description } = body || {};
    const { createOrganization } = await import('@/app/actions/admin.server');
    const res = await createOrganization({ name, type, taxId: taxId ?? null, description: description ?? null });
    if (!res.success) {
      return NextResponse.json({ success: false, error: res.error }, { status: 400 });
    }
    return NextResponse.json({ success: true, data: res.data }, { status: 201 });
  } catch (err: any) {
    console.error('[API] create-organization error', err);
    return NextResponse.json({ success: false, error: 'Erreur serveur' }, { status: 500 });
  }
}
