// app/api/monitoring/actions/counts/route.ts
// =========================================================
// Compteurs d'actions par statut (pour badges temps réel)
// =========================================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/src/db';
import * as schema from '@/src/db/schema';
import { eq, count } from 'drizzle-orm';
import { getAccessContext } from '@/lib/api-guard';
import { userHasPermission } from '@/services/role.service';

export async function GET(req: NextRequest): Promise<Response | void> {
  const { ctx, error } = await getAccessContext();
  if (error || !ctx) {
    if (error) return error;
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 });
  }
  const user: any = { id: ctx.userId, role: ctx.role };

  try {
    const canViewAll = await userHasPermission(user.id, 'AGENT_ACTION_VIEW_ALL');
    const whereClause = canViewAll ? undefined : eq(schema.agentActions.userId, user.id);

    const counts = await db
      .select({ status: schema.agentActions.status, value: count() })
      .from(schema.agentActions)
      .where(whereClause)
      .groupBy(schema.agentActions.status);

    const result: Record<string, number> = {};
    counts.forEach((c) => {
      result[c.status] = c.value;
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error('[API] /monitoring/actions/counts error:', err);
    return NextResponse.json({ error: 'Erreur compteurs' }, { status: 500 });
  }
}
