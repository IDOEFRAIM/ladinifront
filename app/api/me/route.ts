import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSessionFromRequest } from '@/lib/session';
import { fetchMeServer } from '@/app/actions/me.server';
import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq } from 'drizzle-orm';
import { ok, fail, errorMessage } from '@/lib/api-result';
import type { MePayload } from '@/app/actions/me.server';

async function fetchMeFallback(userId: string): Promise<MePayload | null> {
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
  };
}

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const session =
      (await getSessionFromRequest({ cookies: cookieStore } as any)) ||
      (await getSessionFromRequest(req as any));

    if (!session?.userId) {
      return NextResponse.json(fail('Authentification requise'), { status: 401 });
    }

    try {
      const result = await fetchMeServer(String(session.userId));
      if (result?.success && result.data) {
        return NextResponse.json(result, {
          status: 200,
          headers: { 'Cache-Control': 'no-store, max-age=0' },
        });
      }
    } catch (err: any) {
      console.warn('[api/me] primary resolver failed, using fallback:', err);
    }

    const fallback = await fetchMeFallback(String(session.userId));
    if (!fallback) {
      return NextResponse.json(fail('Utilisateur introuvable.'), { status: 401 });
    }

    return NextResponse.json(ok(fallback), {
      status: 200,
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    });
  } catch (err: any) {
    console.error('[api/me] Error:', err);
    return NextResponse.json(fail(errorMessage(err, 'Erreur serveur interne.')), { status: 500 });
  }
}