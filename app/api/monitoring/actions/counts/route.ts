// app/api/monitoring/actions/counts/route.ts
// =========================================================
// Compteurs d'actions par statut (pour badges temps réel)
// =========================================================

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/api-guard';
import { userHasPermission } from '@/services/role.service';

export async function GET(req: NextRequest): Promise<Response | void> {
  const { user, error } = await getAuthenticatedUser(req);
  if (error || !user) {
    if (error) return error;
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }

  try {
    const canViewAll = await userHasPermission(user.id, 'AGENT_ACTION_VIEW_ALL');
    const where = canViewAll ? {} : { userId: user.id };

    const counts = await prisma.agentAction.groupBy({
      by: ['status'],
      where,
      _count: { status: true },
    });

    const result: Record<string, number> = {};
    counts.forEach((c) => {
      result[c.status] = c._count.status;
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error('[API] /monitoring/actions/counts error:', err);
    return NextResponse.json({ error: 'Erreur compteurs' }, { status: 500 });
  }
}
