import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSessionFromRequest } from '@/lib/session';
import { fetchMeServer } from '@/app/actions/me.server';
import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq } from 'drizzle-orm';

async function fetchMeFallback(userId: string) {
  const user = await db.query.users.findFirst({
    where: eq(schema.users.id, userId),
    columns: {
      id: true,
      name: true,
      email: true,
      role: true,
      updatedAt: true,
    },
    with: {
      userOrganizations: {
        columns: {
          organizationId: true,
          role: true,
        },
        with: {
          organization: {
            columns: {
              name: true,
            },
          },
        },
      },
      producer: {
        columns: {
          id: true,
        },
      },
    },
  });

  if (!user) return null;

  return {
    success: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: (user.role || 'USER').toString().toUpperCase(),
      producerId: user.producer?.id || null,
      organizations: (user.userOrganizations || []).map((m) => ({
        organizationId: m.organizationId,
        role: (m.role || 'MEMBER').toString().toUpperCase(),
        name: m.organization?.name || 'Organisation inconnue',
      })),
      permissions: [],
      permissionVersion: user.updatedAt?.getTime() || Date.now(),
    },
  };
}

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const session =
      (await getSessionFromRequest({ cookies: cookieStore } as any)) ||
      (await getSessionFromRequest(req as any));

    if (!session?.userId) {
      return NextResponse.json({ success: false, error: 'Authentification requise' }, { status: 401 });
    }

    try {
      const data = await fetchMeServer(String(session.userId));
      if (data?.success && data?.user) {
        return NextResponse.json(data, {
          status: 200,
          headers: { 'Cache-Control': 'no-store, max-age=0' },
        });
      }
    } catch (err: any) {
      if (!(err instanceof Error && err.message === 'USER_NOT_FOUND')) {
        console.warn('[api/me] primary resolver failed, using fallback:', err);
      }
    }

    const fallback = await fetchMeFallback(String(session.userId));
    if (!fallback) {
      return NextResponse.json({ success: false, error: 'Utilisateur introuvable.' }, { status: 401 });
    }

    return NextResponse.json(fallback, {
      status: 200,
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
  } catch (err: any) {
    console.error('[api/me] Error:', err);
    return NextResponse.json({ success: false, error: 'Erreur serveur interne.' }, { status: 500 });
  }
}