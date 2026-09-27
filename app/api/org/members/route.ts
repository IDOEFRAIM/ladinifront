import { NextResponse } from 'next/server';
import { getOrgMembers } from '@/features/organization/services/org-manager.service';

export async function GET() {
  try {
    const res = await getOrgMembers();
    if (!res.success) return NextResponse.json({ success: false, error: res.error || 'Erreur' }, { status: 400 });
    return NextResponse.json({ success: true, data: res.data });
  } catch (e) {
    console.error('api/org/members GET error', e);
    return NextResponse.json({ success: false, error: 'Erreur' }, { status: 500 });
  }
}
