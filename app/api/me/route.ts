import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSessionFromRequest } from '@/lib/session';
import { fetchMeServer } from '@/features/auth/services/me.service';
import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq } from 'drizzle-orm';
import { ok, fail, errorMessage } from '@/lib/api-result';
import type { MePayload } from '@/features/auth/services/me.service';
import { asError } from '@/lib/errors';
import { isTransientDbError } from '@/lib/db-retry';

async function fetchMeFallback(userId: string): Promise<MePayload | null> {
  const user = await db.query.users.findFirst({
    where: eq(schema.users.id, userId),
    columns: {
      id: true,
      name: true,
      email: true,
      role: true,
      updatedAt: true,
      onboardingCompleted: true,
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
    onboardingCompleted: user.onboardingCompleted,
  };
}

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const session =
      (await getSessionFromRequest({ cookies: cookieStore })) ||
      (await getSessionFromRequest(req));

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
    } catch (_err: unknown) {
    const err = asError(_err);
      // Base indisponible : le repli (requête plus lourde) échouerait pareil et doublerait la charge → 503 immédiat.
      if (isTransientDbError(_err)) {
        console.warn('[api/me] base indisponible (transitoire):', err.message);
        return NextResponse.json(fail('Service momentanément indisponible, réessayez.'), {
          status: 503,
          headers: { 'Retry-After': '3', 'Cache-Control': 'no-store' },
        });
      }
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
  } catch (_err: unknown) {
    const err = asError(_err);
    if (isTransientDbError(_err)) {
      return NextResponse.json(fail('Service momentanément indisponible, réessayez.'), { status: 503, headers: { 'Retry-After': '3' } });
    }
    console.error('[api/me] Error:', err);
    return NextResponse.json(fail(errorMessage(err, 'Erreur serveur interne.')), { status: 500 });
  }
}