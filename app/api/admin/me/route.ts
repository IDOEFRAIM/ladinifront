import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/api-guard';
import { VALID_SYSTEM_ROLES } from '@/lib/validators';
import { cookies } from 'next/headers';
import { COOKIE_NAMES, publicOpts } from '@/lib/cookie-helpers';
import { asError } from '@/lib/errors';

export async function GET(req: NextRequest) {

  const { user, error } = await requireAdmin(req);
  if (error || !user) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

  const { getAdminUser } = await import('@/features/admin/services/admin-organizations.service');
  const dbUser = await getAdminUser(user.id);
  return NextResponse.json({ success: true, data: dbUser });
}

export async function PATCH(req: NextRequest) {
  // Only ADMIN or SUPERADMIN may change roles
  const { user, error } = await requireAdmin(req);
  if (error || !user) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });

  try {
    const body = await req.json();
    const { role, targetUserId } = body as { role?: string; targetUserId?: string };
    if (!role || !VALID_SYSTEM_ROLES.includes(role as any)) {
      return NextResponse.json({ success: false, error: 'Invalid role' }, { status: 400 });
    }
    if (!targetUserId) return NextResponse.json({ success: false, error: 'targetUserId required' }, { status: 400 });

    const { updateUserRole } = await import('@/features/admin/services/admin-organizations.service');
    const updated = await updateUserRole(targetUserId, role);

    // If admin changed their own role, update cookie
    if (targetUserId === user.id) {
      const cookieStore = await cookies();
      cookieStore.set(COOKIE_NAMES.USER_ROLE, String(updated.role).toUpperCase(), publicOpts());
    }

    return NextResponse.json({ success: true, data: { id: updated.id, role: updated.role } });
  } catch (_err: unknown) {
    const err = asError(_err);
    console.error('Error updating role:', err);
    return NextResponse.json({ success: false, error: 'Cannot update role' }, { status: 500 });
  }
}
