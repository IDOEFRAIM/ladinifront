import { NextResponse } from 'next/server';
import { getSessionFromRequest } from '@/lib/session';
import { fetchUserMemberships } from '@/features/organization/services/org-selection.service';

export async function GET(req: Request) {
  const session = await getSessionFromRequest(req);
  if (!session?.userId) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const res = await fetchUserMemberships(session.userId);
  if (!res.success) return NextResponse.json({ success: false, error: 'Error fetching memberships' }, { status: 500 });

  return NextResponse.json({ success: true, memberships: res.memberships });
}
