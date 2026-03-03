import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getAuthenticatedUser } from '@/lib/api-guard';
import { prisma } from '@/lib/prisma';
import { VALID_SYSTEM_ROLES } from '@/lib/validators';
import { cookies } from 'next/headers';
import { COOKIE_NAMES, publicOpts } from '@/lib/cookie-helpers';

export async function GET(req: NextRequest) {
  const { user, error } = await getAuthenticatedUser(req);
  if (error || !user) return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });

  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { id: true, name: true, role: true } });
  return NextResponse.json({ success: true, data: dbUser });
}

export async function PATCH(req: NextRequest) {
  // Only ADMIN or SUPERADMIN may change roles
  const { user, error } = await getAuthenticatedUser(req, ['ADMIN', 'SUPERADMIN']);
  if (error || !user) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });

  try {
    const body = await req.json();
    const { role, targetUserId } = body as { role?: string; targetUserId?: string };
    if (!role || !VALID_SYSTEM_ROLES.includes(role as any)) {
      return NextResponse.json({ success: false, error: 'Invalid role' }, { status: 400 });
    }
    if (!targetUserId) return NextResponse.json({ success: false, error: 'targetUserId required' }, { status: 400 });

    const updated = await prisma.user.update({ where: { id: targetUserId }, data: { role: role as any } });

    // If admin changed their own role, update cookie
    if (targetUserId === user.id) {
      const cookieStore = await cookies();
      cookieStore.set(COOKIE_NAMES.USER_ROLE, String(updated.role), publicOpts());
    }

    return NextResponse.json({ success: true, data: { id: updated.id, role: updated.role } });
  } catch (err: any) {
    console.error('Error updating role:', err);
    return NextResponse.json({ success: false, error: 'Cannot update role' }, { status: 500 });
  }
}
